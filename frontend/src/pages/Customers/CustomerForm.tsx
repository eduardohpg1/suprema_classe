import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createCustomer,
  updateCustomer,
  getCustomer,
  CustomerPayload,
} from '../../api/customers';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Spinner } from '../../components/UI/Spinner';
import { maskCPF, maskPhone, isValidCPF } from '../../lib/format';

const schema = z.object({
  name:    z.string().min(2, 'Informe o nome completo'),
  cpf:     z.string().min(1, 'Informe o CPF').refine(isValidCPF, 'CPF inválido'),
  rg:      z.string().optional(),
  phone:   z.string().min(1, 'Informe o telefone').refine((v) => v.replace(/\D/g, '').length >= 10, 'Telefone inválido'),
  street:  z.string().optional(),
  number:  z.string().optional(),
  bairro:  z.string().optional(),
  cidade:  z.string().optional(),
  notes:   z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function parseAddress(raw?: string | null) {
  if (!raw) return { street: '', number: '', bairro: '', cidade: '' };
  // formato salvo: "Rua X, 123 | Bairro Y | Cidade Z"
  const parts = raw.split('|').map((s) => s.trim());
  const streetNum = (parts[0] || '').split(',');
  return {
    street: streetNum[0]?.trim() || '',
    number: streetNum[1]?.trim() || '',
    bairro: parts[1] || '',
    cidade: parts[2] || '',
  };
}

function buildAddress(v: FormValues): string {
  const parts = [];
  if (v.street) parts.push(`${v.street}${v.number ? ', ' + v.number : ''}`);
  if (v.bairro) parts.push(v.bairro);
  if (v.cidade) parts.push(v.cidade);
  return parts.join(' | ');
}

export function CustomerForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading: loadingCustomer } = useQuery(
    ['customer', id],
    () => getCustomer(id as string),
    { enabled: isEdit }
  );

  const { register, handleSubmit, control, reset, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (existing) {
      const addr = parseAddress(existing.address);
      reset({
        name:   existing.name,
        cpf:    maskCPF(existing.cpf),
        rg:     existing.rg ?? '',
        phone:  maskPhone(existing.phone),
        street: addr.street,
        number: addr.number,
        bairro: addr.bairro,
        cidade: addr.cidade,
        notes:  existing.notes ?? '',
      });
    }
  }, [existing, reset]);

  const mutation = useMutation(
    (values: FormValues) => {
      const payload: CustomerPayload = {
        name:    values.name,
        cpf:     values.cpf.replace(/\D/g, ''),
        rg:      values.rg || undefined,
        phone:   values.phone.replace(/\D/g, ''),
        address: buildAddress(values) || undefined,
        notes:   values.notes || undefined,
      };
      return isEdit ? updateCustomer(id as string, payload) : createCustomer(payload);
    },
    {
      onSuccess: () => {
        toast.success(isEdit ? 'Cliente atualizado!' : 'Cliente cadastrado!');
        queryClient.invalidateQueries('customers');
        navigate('/clientes');
      },
      onError: () => toast.error('Não foi possível salvar o cliente.'),
    }
  );

  if (isEdit && loadingCustomer) return <Spinner className="py-20" label="Carregando..." />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h2 className="text-2xl font-bold text-gray-900">
        {isEdit ? 'Editar Cliente' : 'Novo Cliente'}
      </h2>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

        <Input label="Nome completo" error={errors.name?.message} {...register('name')} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller name="cpf" control={control} render={({ field }) => (
            <Input label="CPF" placeholder="000.000.000-00" error={errors.cpf?.message}
              value={field.value || ''} onChange={(e) => field.onChange(maskCPF(e.target.value))} />
          )} />
          <Input label="RG" placeholder="00.000.000-0" {...register('rg')} />
        </div>

        <Controller name="phone" control={control} render={({ field }) => (
          <Input label="Telefone" placeholder="(00) 00000-0000" error={errors.phone?.message}
            value={field.value || ''} onChange={(e) => field.onChange(maskPhone(e.target.value))} />
        )} />

        {/* Endereço separado por campos */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Endereço</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Rua / Logradouro" placeholder="Rua das Flores" {...register('street')} />
            </div>
            <Input label="Número" placeholder="123" {...register('number')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Bairro" placeholder="Centro" {...register('bairro')} />
            <Input label="Cidade" placeholder="Caçapava" {...register('cidade')} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Observações</label>
          <textarea rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            {...register('notes')} />
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" loading={mutation.isLoading}>
            {isEdit ? 'Salvar alterações' : 'Cadastrar cliente'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CustomerForm;
