import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle2, Plus, Minus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProducts, getCategories } from '../../api/products';
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

  const [mainSearch, setMainSearch] = useState('');
  const [mainFocused, setMainFocused] = useState(false);
  const [accSearch, setAccSearch] = useState('');
  const [accFocused, setAccFocused] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const debouncedMain = useDebounce(mainSearch, 350);
  const debouncedAcc = useDebounce(accSearch, 350);
  const debouncedCustomer = useDebounce(customerSearch, 350);

  const [mainItem, setMainItem] = useState<SelectedItem | null>(null);
  const [accessories, setAccessories] = useState<SelectedItem[]>([]);
  const [calendarProductId, setCalendarProductId] = useState(searchParams.get('productId') || '');
  const [calendarAvailability, setCalendarAvailability] = useState<
    'unknown' | 'checking' | 'available' | 'conflict'
  >('unknown');

  const { data: categories = [] } = useQuery('categories', getCategories, { staleTime: 60_000 });
  const accessoryCategoryId = categories.find((c) => c.name.toLowerCase().includes('acess'))?.id;

  const { data: mainProductsData } = useQuery(
    ['products-main', debouncedMain],
    () => getProducts({ search: debouncedMain, pageSize: 30 })
  );

  const { data: accProductsData } = useQuery(
    ['products-acc', debouncedAcc, accessoryCategoryId],
    () => getProducts({
      search: debouncedAcc,
      pageSize: 30,
      ...(accessoryCategoryId ? { categoryId: accessoryCategoryId } : {}),
    })
  );

  const { data: customersData } = useQuery(
    ['customers-select', debouncedCustomer],
    () => getCustomers({ search: debouncedCustomer, pageSize: 20 })
  );

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { totalValue: 0, depositValue: 0, remainingValue: 0 },
  });

  const pickupDate = watch('pickupDate');
  const returnDate = watch('returnDate');
  const totalValue = watch('totalValue');
  const depositValue = watch('depositValue');

  useEffect(() => {
    const mainTotal = mainItem ? Number(mainItem.product.rentalPrice) * mainItem.quantity : 0;
    const accTotal = accessories.reduce((acc, i) => acc + Number(i.product.rentalPrice) * i.quantity, 0);
    const sum = mainTotal + accTotal;
    if (sum > 0) setValue('totalValue', Math.round(sum * 100) / 100);
  }, [mainItem, accessories, setValue]);

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

  useEffect(() => {
    if (!calendarProductId || !pickupDate || !returnDate) { setCalendarAvailability('unknown'); return; }
    if (new Date(returnDate) < new Date(pickupDate)) { setCalendarAvailability('conflict'); return; }
    let cancelled = false;
    setCalendarAvailability('checking');
    checkAvailability(calendarProductId, pickupDate, returnDate)
      .then((res) => { if (!cancelled) setCalendarAvailability(res.available ? 'available' : 'conflict'); })
      .catch(() => { if (!cancelled) setCalendarAvailability('unknown'); });
    return () => { cancelled = true; };
  }, [calendarProductId, pickupDate, returnDate]);

  // Pré-seleciona produto se veio da URL
  useEffect(() => {
    const productId = searchParams.get('productId');
    if (!productId || mainItem) return;
    getProducts({ search: productId, pageSize: 5 }).then((res) => {
      const p = res.data.find((x) => x.id === productId);
      if (p) { setMainItem({ product: p, quantity: 1 }); setCalendarProductId(p.id); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectMain = (product: Product) => {
    setMainItem({ product, quantity: 1 });
    setCalendarProductId(product.id);
    setMainSearch('');
    setMainFocused(false);
  };

  const clearMain = () => {
    setMainItem(null);
    if (calendarProductId === mainItem?.product.id) {
      setCalendarProductId(accessories[0]?.product.id || '');
    }
  };

  const addAcc = (product: Product) => {
    if (accessories.find((i) => i.product.id === product.id)) {
      toast.error('Este acessório já foi adicionado.');
      return;
    }
    setAccessories((prev) => [...prev, { product, quantity: 1 }]);
    setAccSearch('');
  };

  const removeAcc = (productId: string) => {
    setAccessories((prev) => prev.filter((i) => i.product.id !== productId));
    if (calendarProductId === productId) setCalendarProductId(mainItem?.product.id || '');
  };

  const changeAccQty = (productId: string, delta: number) => {
    setAccessories((prev) =>
      prev.map((i) => i.product.id === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
    );
  };

  const mutation = useMutation(
    (values: FormValues) => {
      if (!mainItem) throw new Error('Selecione o produto principal.');
      const payload: RentalPayload = {
        items: [
          { productId: mainItem.product.id, quantity: mainItem.quantity },
          ...accessories.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        ],
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
      onError: (err: Error) => { toast.error(err.message || 'Erro ao criar locação.'); },
    }
  );

  const onSubmit = (values: FormValues) => {
    if (!mainItem) { toast.error('Selecione o produto principal.'); return; }
    if (calendarAvailability === 'conflict') {
      toast.error('Há conflito de datas para um dos produtos. Ajuste o período.');
      return;
    }
    mutation.mutate(values);
  };

  const handleCalendarSelect = (date: string, day?: AvailabilityDay) => {
    if (day?.status === 'rented') { toast.error('Esse dia já está alugado para este produto.'); return; }
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

  const mainProductOptions = useMemo(
    () =>
      (mainProductsData?.data ?? [])
        .filter((p) => p.id !== mainItem?.product.id)
        .filter((p) => !accessoryCategoryId || p.category?.id !== accessoryCategoryId)
        .map((p) => ({ value: p.id, label: `${p.name} (${p.code}) — ${formatCurrency(p.rentalPrice)}`, product: p })),
    [mainProductsData, mainItem, accessoryCategoryId]
  );

  const accOptions = useMemo(
    () =>
      (accProductsData?.data ?? [])
        .filter((p) => !accessories.find((i) => i.product.id === p.id))
        .map((p) => ({ value: p.id, label: `${p.name} (${p.code}) — ${formatCurrency(p.rentalPrice)}`, product: p })),
    [accProductsData, accessories]
  );

  const calendarProduct =
    mainItem?.product.id === calendarProductId
      ? mainItem?.product
      : accessories.find((i) => i.product.id === calendarProductId)?.product;

  const allItems = mainItem ? [mainItem, ...accessories] : accessories;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h2 className="text-2xl font-bold text-gray-900">Nova Locação</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

          {/* Produto principal */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Produto principal <span className="text-red-500">*</span>
            </label>
            {mainItem ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{mainItem.product.name}</p>
                  <p className="text-xs text-gray-500">
                    {mainItem.product.code} · {mainItem.product.size} · {formatCurrency(mainItem.product.rentalPrice)}
                  </p>
                </div>
                <button type="button" onClick={clearMain} className="rounded p-0.5 text-gray-300 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  label=""
                  placeholder="Buscar vestido, terno, traje..."
                  value={mainSearch}
                  onChange={(e) => setMainSearch(e.target.value)}
                  onFocus={() => setMainFocused(true)}
                  onBlur={() => setTimeout(() => setMainFocused(false), 150)}
                />
                {mainFocused && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
                    {mainProductOptions.length > 0 ? (
                      mainProductOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectMain(opt.product)}
                          className="w-full px-3 py-2.5 text-left text-sm hover:bg-primary-50 flex items-center justify-between gap-2"
                        >
                          <span className="text-gray-800">{opt.label}</span>
                          <Plus className="h-3.5 w-3.5 text-primary-500 flex-shrink-0" />
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2.5 text-sm text-gray-400 italic">Nenhum produto encontrado.</p>
                    )}
                  </div>
                )}
              </div>
            )}
            {!mainItem && (
              <p className="mt-1.5 text-xs text-red-500">Selecione o produto principal da locação.</p>
            )}
          </div>

          {/* Acessórios */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Acessórios <span className="text-gray-400 font-normal text-xs">(opcional)</span>
            </label>

            {accessories.length > 0 && (
              <div className="mb-3 space-y-2">
                {accessories.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-500">{item.product.code} · {formatCurrency(item.product.rentalPrice)} cada</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => changeAccQty(item.product.id, -1)} className="rounded p-0.5 text-gray-400 hover:bg-white hover:text-gray-700">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-semibold text-gray-700">{item.quantity}</span>
                      <button type="button" onClick={() => changeAccQty(item.product.id, 1)} className="rounded p-0.5 text-gray-400 hover:bg-white hover:text-primary-600">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button type="button" onClick={() => removeAcc(item.product.id)} className="rounded p-0.5 text-gray-300 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <Input
                label=""
                placeholder="Buscar gravata, camisa, suspensório..."
                value={accSearch}
                onChange={(e) => setAccSearch(e.target.value)}
                onFocus={() => setAccFocused(true)}
                onBlur={() => setTimeout(() => setAccFocused(false), 150)}
              />
              {accFocused && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  {accOptions.length > 0 ? (
                    accOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addAcc(opt.product)}
                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-primary-50 flex items-center justify-between gap-2"
                      >
                        <span className="text-gray-800">{opt.label}</span>
                        <Plus className="h-3.5 w-3.5 text-primary-500 flex-shrink-0" />
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2.5 text-sm text-gray-400 italic">Nenhum acessório encontrado.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <div className="flex-1">
                <Input label="Buscar cliente" placeholder="Nome..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
              </div>
              <Button type="button" variant="outline" size="md" onClick={() => navigate('/clientes/novo')}>Novo</Button>
            </div>
            <Controller
              name="customerId"
              control={control}
              render={({ field }) => (
                <Select placeholder="Selecione o cliente" options={customerOptions} error={errors.customerId?.message} value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Retirada" type="date" error={errors.pickupDate?.message} {...register('pickupDate')} />
            <Input label="Devolução" type="date" error={errors.returnDate?.message} {...register('returnDate')} />
          </div>

          {calendarAvailability !== 'unknown' && calendarProductId && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              calendarAvailability === 'available' ? 'bg-green-50 text-green-700'
              : calendarAvailability === 'conflict' ? 'bg-red-50 text-red-700'
              : 'bg-gray-50 text-gray-500'
            }`}>
              {calendarAvailability === 'available' && <><CheckCircle2 className="h-4 w-4" /> Período disponível</>}
              {calendarAvailability === 'conflict' && <><AlertTriangle className="h-4 w-4" /> Conflito de datas neste período</>}
              {calendarAvailability === 'checking' && 'Verificando disponibilidade...'}
            </div>
          )}

          {/* Resumo de valores */}
          <div className="grid grid-cols-1 gap-3">
            {allItems.length > 0 && (
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 space-y-0.5">
                {mainItem && (
                  <div className="flex justify-between">
                    <span>{mainItem.product.name}</span>
                    <span>{formatCurrency(Number(mainItem.product.rentalPrice) * mainItem.quantity)}</span>
                  </div>
                )}
                {accessories.map((i) => (
                  <div key={i.product.id} className="flex justify-between">
                    <span>{i.product.name}{i.quantity > 1 ? ` ×${i.quantity}` : ''}</span>
                    <span>{formatCurrency(Number(i.product.rentalPrice) * i.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-gray-700 border-t border-gray-200 pt-1 mt-1">
                  <span>Total</span>
                  <span>{formatCurrency(allItems.reduce((s, i) => s + Number(i.product.rentalPrice) * i.quantity, 0))}</span>
                </div>
              </div>
            )}
            <Input label="Valor total (R$)" type="number" step="0.01" error={errors.totalValue?.message} {...register('totalValue')} />
            <Input label="Sinal / entrada (R$) — 50% sugerido" type="number" step="0.01" {...register('depositValue')} />
            <Input label="Valor restante (R$)" type="number" step="0.01" readOnly className="bg-gray-50" {...register('remainingValue')} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Observações</label>
            <textarea rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200" {...register('notes')} />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button type="submit" loading={mutation.isLoading} disabled={calendarAvailability === 'conflict'}>Criar locação</Button>
          </div>
        </div>

        {/* Calendário */}
        <div className="space-y-4">
          {calendarProduct && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-900">{calendarProduct.name}</p>
              <p className="text-sm text-primary-600">{formatCurrency(calendarProduct.rentalPrice)} /locação</p>
              {allItems.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {allItems.map((i) => (
                    <button
                      key={i.product.id}
                      type="button"
                      onClick={() => setCalendarProductId(i.product.id)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                        i.product.id === calendarProductId ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {i.product.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {calendarProductId ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs text-gray-500">
                {!pickupDate ? 'Clique em um dia para definir a retirada.'
                  : !returnDate ? 'Agora clique no dia da devolução.'
                  : 'Período selecionado. Clique novamente para refazer.'}
              </p>
              <ProductCalendar productId={calendarProductId} onDateClick={handleCalendarSelect} selectedStart={pickupDate} selectedEnd={returnDate} />
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
