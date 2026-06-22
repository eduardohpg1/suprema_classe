import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle2, Plus, Minus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProducts } from '../../api/products';
import { getCustomers } from '../../api/customers';
import { createRental, RentalPayload } from '../../api/rentals';
import { checkAvailability } from '../../api/availability';
import { useDebounce } from '../../hooks/useDebounce';
import { ProductCalendar } from '../../components/ProductCalendar';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { formatCurrency } from '../../lib/format';
import { AvailabilityDay, Product } from '../../types';

const schema = z
  .object({
    customerId: z.string().min(1, 'Selecione um cliente'),
    pickupDate: z.string().min(1, 'Informe a data de retirada'),
    returnDate: z.string().min(1, 'Informe a data de devolução'),
    totalValue: z.coerce.number().positive('Valor total deve ser maior que zero'),
    depositValue: z.coerce.number().nonnegative(),
    remainingValue: z.coerce.number(),
    notes: z.string().optional(),
  })
  .refine((d) => new Date(d.returnDate) >= new Date(d.pickupDate), {
    message: 'A devolução deve ser após a retirada',
    path: ['returnDate'],
  });

type FormValues = z.infer<typeof schema>;

interface SelectedItem {
  product: Product;
  quantity: number;
}

export function RentalForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [productSearch, setProductSearch] = useState('');
  const [productFocused, setProductFocused] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedProduct = useDebounce(productSearch, 350);
  const debouncedCustomer = useDebounce(customerSearch, 350);

  // Produto principal (para calendário)
  const [mainProductId, setMainProductId] = useState(searchParams.get('productId') || '');
  // Itens selecionados na locação
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [calendarAvailability, setCalendarAvailability] = useState<
    'unknown' | 'checking' | 'available' | 'conflict'
  >('unknown');

  const { data: productsData } = useQuery(
    ['products-select', debouncedProduct],
    () => getProducts({ search: debouncedProduct, pageSize: 30 })
  );
  const { data: customersData } = useQuery(
    ['customers-select', debouncedCustomer],
    () => getCustomers({ search: debouncedCustomer, pageSize: 20 })
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      totalValue: 0,
      depositValue: 0,
      remainingValue: 0,
    },
  });

  const pickupDate = watch('pickupDate');
  const returnDate = watch('returnDate');
  const totalValue = watch('totalValue');
  const depositValue = watch('depositValue');

  // Auto-calcula total com base nos itens
  useEffect(() => {
    const sum = items.reduce((acc, i) => acc + Number(i.product.rentalPrice) * i.quantity, 0);
    if (sum > 0) {
      setValue('totalValue', Math.round(sum * 100) / 100);
    }
  }, [items, setValue]);

  // Sinal = 50% do total; restante = total - sinal
  useEffect(() => {
    const total = Number(totalValue) || 0;
    setValue('depositValue', Math.round((total / 2) * 100) / 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalValue]);

  useEffect(() => {
    const total = Number(totalValue) || 0;
    const deposit = Number(depositValue) || 0;
    setValue('remainingValue', Math.round((total - deposit) * 100) / 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalValue, depositValue]);

  // Verifica disponibilidade do produto principal para o calendário
  useEffect(() => {
    if (!mainProductId || !pickupDate || !returnDate) {
      setCalendarAvailability('unknown');
      return;
    }
    if (new Date(returnDate) < new Date(pickupDate)) {
      setCalendarAvailability('conflict');
      return;
    }
    let cancelled = false;
    setCalendarAvailability('checking');
    checkAvailability(mainProductId, pickupDate, returnDate)
      .then((res) => {
        if (!cancelled) setCalendarAvailability(res.available ? 'available' : 'conflict');
      })
      .catch(() => {
        if (!cancelled) setCalendarAvailability('unknown');
      });
    return () => { cancelled = true; };
  }, [mainProductId, pickupDate, returnDate]);

  const addItem = (product: Product) => {
    if (items.find((i) => i.product.id === product.id)) {
      toast.error('Este produto já foi adicionado.');
      return;
    }
    setItems((prev) => [...prev, { product, quantity: 1 }]);
    if (!mainProductId) setMainProductId(product.id);
    setProductSearch('');
  };

  const removeItem = (productId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.product.id !== productId);
      if (mainProductId === productId) {
        setMainProductId(next[0]?.product.id || '');
      }
      return next;
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: Math.max(1, i.quantity + delta) }
          : i
      )
    );
  };

  const mutation = useMutation(
    (values: FormValues) => {
      if (items.length === 0) throw new Error('Adicione ao menos um produto.');
      const payload: RentalPayload = {
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        customerId: values.customerId,
        pickupDate: values.pickupDate,
        returnDate: values.returnDate,
        totalValue: Number(values.totalValue),
        depositValue: Number(values.depositValue),
        remainingValue: Number(values.remainingValue),
        notes: values.notes || undefined,
      };
      return createRental(payload);
    },
    {
      onSuccess: (rental) => {
        toast.success('Locação criada com sucesso!');
        queryClient.invalidateQueries('rentals');
        navigate(`/locacoes/${rental.id}`);
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Erro ao criar locação.');
      },
    }
  );

  const onSubmit = (values: FormValues) => {
    if (items.length === 0) {
      toast.error('Adicione ao menos um produto.');
      return;
    }
    if (calendarAvailability === 'conflict') {
      toast.error('Há conflito de datas para um dos produtos. Ajuste o período.');
      return;
    }
    mutation.mutate(values);
  };

  const handleCalendarSelect = (date: string, day?: AvailabilityDay) => {
    if (day?.status === 'rented') {
      toast.error('Esse dia já está alugado para este produto.');
      return;
    }
    if (!pickupDate || returnDate || date < pickupDate) {
      setValue('pickupDate', date, { shouldValidate: true });
      setValue('returnDate', '', { shouldValidate: false });
    } else {
      setValue('returnDate', date, { shouldValidate: true });
    }
  };

  const customerOptions = useMemo(
    () => (customersData?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [customersData]
  );

  const productOptions = useMemo(
    () =>
      (productsData?.data ?? [])
        .filter((p) => !items.find((i) => i.product.id === p.id))
        .map((p) => ({ value: p.id, label: `${p.name} (${p.code}) — ${formatCurrency(p.rentalPrice)}` })),
    [productsData, items]
  );

  const mainProduct = items.find((i) => i.product.id === mainProductId)?.product;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h2 className="text-2xl font-bold text-gray-900">Nova Locação</h2>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        {/* Coluna esquerda */}
        <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

          {/* Produtos */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Produtos / Acessórios
            </label>

            {/* Itens já adicionados */}
            {items.length > 0 && (
              <div className="mb-3 space-y-2">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.product.code} · {formatCurrency(item.product.rentalPrice)} cada
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => changeQty(item.product.id, -1)}
                        className="rounded p-0.5 text-gray-400 hover:bg-white hover:text-gray-700"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-semibold text-primary-700">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQty(item.product.id, 1)}
                        className="rounded p-0.5 text-gray-400 hover:bg-white hover:text-primary-600"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id)}
                      className="rounded p-0.5 text-gray-300 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Buscador para adicionar novo item */}
            <div className="relative">
              <Input
                label=""
                placeholder="Buscar produto ou acessório..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onFocus={() => setProductFocused(true)}
                onBlur={() => setTimeout(() => setProductFocused(false), 150)}
              />
              {productFocused && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  {productOptions.length > 0 ? (
                    productOptions.map((opt) => {
                      const prod = productsData?.data.find((p) => p.id === opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { prod && addItem(prod); setProductSearch(''); }}
                          className="w-full px-3 py-2.5 text-left text-sm hover:bg-primary-50 flex items-center justify-between gap-2"
                        >
                          <span className="text-gray-800">{opt.label}</span>
                          <Plus className="h-3.5 w-3.5 text-primary-500 flex-shrink-0" />
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-3 py-2.5 text-sm text-gray-400 italic">Nenhum produto encontrado.</p>
                  )}
                </div>
              )}
            </div>

            {items.length === 0 && (
              <p className="mt-2 text-xs text-red-500">Adicione ao menos um produto.</p>
            )}
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <div className="flex-1">
                <Input
                  label="Buscar cliente"
                  placeholder="Nome..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => navigate('/clientes/novo')}
              >
                Novo
              </Button>
            </div>
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <Select
                  placeholder="Selecione o cliente"
                  options={customerOptions}
                  error={errors.customerId?.message}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Retirada"
              type="date"
              error={errors.pickupDate?.message}
              {...register('pickupDate')}
            />
            <Input
              label="Devolução"
              type="date"
              error={errors.returnDate?.message}
              {...register('returnDate')}
            />
          </div>

          {/* Status disponibilidade */}
          {calendarAvailability !== 'unknown' && mainProductId && (
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                calendarAvailability === 'available'
                  ? 'bg-green-50 text-green-700'
                  : calendarAvailability === 'conflict'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-gray-50 text-gray-500'
              }`}
            >
              {calendarAvailability === 'available' && (
                <><CheckCircle2 className="h-4 w-4" /> Período disponível</>
              )}
              {calendarAvailability === 'conflict' && (
                <><AlertTriangle className="h-4 w-4" /> Conflito de datas neste período</>
              )}
              {calendarAvailability === 'checking' && 'Verificando disponibilidade...'}
            </div>
          )}

          {/* Valores */}
          <div className="grid grid-cols-1 gap-3">
            {items.length > 0 && (
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                Soma dos produtos: {formatCurrency(
                  items.reduce((s, i) => s + Number(i.product.rentalPrice) * i.quantity, 0)
                )}
              </div>
            )}
            <Input
              label="Valor total (R$)"
              type="number"
              step="0.01"
              error={errors.totalValue?.message}
              {...register('totalValue')}
            />
            <Input
              label="Sinal / entrada (R$) — 50% sugerido"
              type="number"
              step="0.01"
              {...register('depositValue')}
            />
            <Input
              label="Valor restante (R$)"
              type="number"
              step="0.01"
              readOnly
              className="bg-gray-50"
              {...register('remainingValue')}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Observações
            </label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={mutation.isLoading}
              disabled={calendarAvailability === 'conflict'}
            >
              Criar locação
            </Button>
          </div>
        </div>

        {/* Coluna direita - calendário */}
        <div className="space-y-4">
          {mainProduct && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-900">{mainProduct.name}</p>
              <p className="text-sm text-primary-600">{formatCurrency(mainProduct.rentalPrice)} /locação</p>
              {items.length > 1 && (
                <p className="mt-1 text-xs text-gray-400">
                  Calendário mostrando disponibilidade deste produto. Clique para alternar.
                </p>
              )}
              {items.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {items.map((i) => (
                    <button
                      key={i.product.id}
                      type="button"
                      onClick={() => setMainProductId(i.product.id)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                        i.product.id === mainProductId
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {i.product.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {mainProductId ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs text-gray-500">
                {!pickupDate
                  ? 'Clique em um dia para definir a retirada.'
                  : !returnDate
                    ? 'Agora clique no dia da devolução.'
                    : 'Período selecionado. Clique novamente para refazer.'}
              </p>
              <ProductCalendar
                productId={mainProductId}
                onDateClick={handleCalendarSelect}
                selectedStart={pickupDate}
                selectedEnd={returnDate}
              />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-sm text-gray-400">
              Adicione um produto para ver a disponibilidade
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

export default RentalForm;
