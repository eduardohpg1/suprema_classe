import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProducts, getProduct } from '../../api/products';
import { getCustomers } from '../../api/customers';
import { createRental, RentalPayload } from '../../api/rentals';
import { checkAvailability } from '../../api/availability';
import { useDebounce } from '../../hooks/useDebounce';
import { ProductCalendar } from '../../components/ProductCalendar';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { formatCurrency } from '../../lib/format';
import { AvailabilityDay } from '../../types';

const schema = z
  .object({
    productId: z.string().min(1, 'Selecione um produto'),
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

export function RentalForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedProduct = searchParams.get('productId') || '';

  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedProduct = useDebounce(productSearch, 350);
  const debouncedCustomer = useDebounce(customerSearch, 350);
  const [availability, setAvailability] = useState<
    'unknown' | 'checking' | 'available' | 'conflict'
  >('unknown');

  const { data: productsData } = useQuery(
    ['products-select', debouncedProduct],
    () => getProducts({ search: debouncedProduct, pageSize: 20 })
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
      productId: preselectedProduct,
      totalValue: 0,
      depositValue: 0,
      remainingValue: 0,
    },
  });

  const productId = watch('productId');
  const pickupDate = watch('pickupDate');
  const returnDate = watch('returnDate');
  const totalValue = watch('totalValue');
  const depositValue = watch('depositValue');

  // Busca preço do produto selecionado para sugerir total
  const { data: selectedProduct } = useQuery(
    ['product', productId],
    () => getProduct(productId),
    { enabled: !!productId }
  );

  // Sugere valor total = preço de locação ao escolher produto (se ainda zero)
  useEffect(() => {
    if (selectedProduct && (!totalValue || totalValue === 0)) {
      setValue('totalValue', selectedProduct.rentalPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct]);

  // Sinal = 50% do total (editável); restante = total - sinal
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

  // Verifica disponibilidade ao mudar produto/datas
  useEffect(() => {
    if (!productId || !pickupDate || !returnDate) {
      setAvailability('unknown');
      return;
    }
    if (new Date(returnDate) < new Date(pickupDate)) {
      setAvailability('conflict');
      return;
    }
    let cancelled = false;
    setAvailability('checking');
    checkAvailability(productId, pickupDate, returnDate)
      .then((res) => {
        if (!cancelled)
          setAvailability(res.available ? 'available' : 'conflict');
      })
      .catch(() => {
        if (!cancelled) setAvailability('unknown');
      });
    return () => {
      cancelled = true;
    };
  }, [productId, pickupDate, returnDate]);

  const mutation = useMutation(
    (values: FormValues) => {
      const payload: RentalPayload = {
        productId: values.productId,
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
      // Erros 409 (conflito) já são tratados no interceptor.
      onError: () => {},
    }
  );

  const onSubmit = (values: FormValues) => {
    if (availability === 'conflict') {
      toast.error('Há conflito de datas para este produto. Ajuste o período.');
      return;
    }
    mutation.mutate(values);
  };

  // Seleção de datas pelo calendário: 1º clique define a retirada,
  // 2º clique (em data igual/posterior) define a devolução.
  const handleCalendarSelect = (date: string, day?: AvailabilityDay) => {
    if (day?.status === 'rented') {
      toast.error('Esse dia já está alugado para este produto.');
      return;
    }
    // Reinicia a seleção se: não há retirada, o período já está completo,
    // ou clicou em um dia anterior à retirada.
    if (!pickupDate || returnDate || date < pickupDate) {
      setValue('pickupDate', date, { shouldValidate: true });
      setValue('returnDate', '', { shouldValidate: false });
    } else {
      setValue('returnDate', date, { shouldValidate: true });
    }
  };

  const productOptions = useMemo(
    () =>
      (productsData?.data ?? []).map((p) => ({
        value: p.id,
        label: `${p.name} (${p.code})`,
      })),
    [productsData]
  );

  const customerOptions = useMemo(
    () =>
      (customersData?.data ?? []).map((c) => ({
        value: c.id,
        label: `${c.name}`,
      })),
    [customersData]
  );

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
        {/* Coluna esquerda - dados */}
        <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {/* Produto */}
          <div className="space-y-2">
            <Input
              label="Buscar produto"
              placeholder="Nome ou código..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <Controller
              name="productId"
              control={control}
              render={({ field }) => (
                <Select
                  placeholder="Selecione o produto"
                  options={productOptions}
                  error={errors.productId?.message}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
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

          {/* Status de disponibilidade */}
          {availability !== 'unknown' && (
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                availability === 'available'
                  ? 'bg-green-50 text-green-700'
                  : availability === 'conflict'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-gray-50 text-gray-500'
              }`}
            >
              {availability === 'available' && (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Período disponível
                </>
              )}
              {availability === 'conflict' && (
                <>
                  <AlertTriangle className="h-4 w-4" /> Conflito de datas neste
                  período
                </>
              )}
              {availability === 'checking' && 'Verificando disponibilidade...'}
            </div>
          )}

          {/* Valores */}
          <div className="grid grid-cols-1 gap-3">
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
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={mutation.isLoading}
              disabled={availability === 'conflict'}
            >
              Criar locação
            </Button>
          </div>
        </div>

        {/* Coluna direita - mini-calendário */}
        <div className="space-y-4">
          {selectedProduct && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-900">
                {selectedProduct.name}
              </p>
              <p className="text-sm text-primary-600">
                {formatCurrency(selectedProduct.rentalPrice)} /locação
              </p>
            </div>
          )}
          {productId ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs text-gray-500">
                {!pickupDate
                  ? 'Clique em um dia para definir a retirada.'
                  : !returnDate
                    ? 'Agora clique no dia da devolução.'
                    : 'Período selecionado. Clique novamente para refazer.'}
              </p>
              <ProductCalendar
                productId={productId}
                onDateClick={handleCalendarSelect}
                selectedStart={pickupDate}
                selectedEnd={returnDate}
              />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-sm text-gray-400">
              Selecione um produto para ver a disponibilidade
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

export default RentalForm;
