import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createProduct,
  updateProduct,
  getProduct,
  getCategories,
  uploadPhotos,
  deletePhoto,
  ProductPayload,
} from '../../api/products';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Spinner } from '../../components/UI/Spinner';
import { ProductStatus } from '../../types';
import { productStatusConfig } from '../../lib/statusConfig';

const schema = z.object({
  name: z.string().min(2, 'Informe o nome do produto'),
  code: z.string().optional(),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  size: z.string().min(1, 'Informe o tamanho'),
  color: z.string().min(1, 'Informe a cor'),
  rentalPrice: z.coerce.number().positive('Preço deve ser maior que zero'),
  salePrice: z.coerce.number().nonnegative().optional().or(z.literal('')),
  notes: z.string().optional(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE']),
});

type FormValues = z.infer<typeof schema>;

interface PreviewFile {
  file: File;
  url: string;
}

export function ProductForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newFiles, setNewFiles] = useState<PreviewFile[]>([]);

  const { data: categories = [] } = useQuery('categories', getCategories, {
    staleTime: 5 * 60_000,
  });

  const { data: existing, isLoading: loadingProduct } = useQuery(
    ['product', id],
    () => getProduct(id as string),
    { enabled: isEdit }
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'AVAILABLE' },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        code: existing.code,
        categoryId: existing.categoryId,
        size: existing.size,
        color: existing.color,
        rentalPrice: existing.rentalPrice,
        salePrice: existing.salePrice ?? undefined,
        notes: existing.notes ?? '',
        status: existing.status,
      });
    }
  }, [existing, reset]);

  const mutation = useMutation(
    async (values: FormValues) => {
      const payload: ProductPayload = {
        name: values.name,
        code: values.code || '',
        categoryId: values.categoryId,
        size: values.size,
        color: values.color,
        rentalPrice: Number(values.rentalPrice),
        salePrice:
          values.salePrice === '' || values.salePrice == null
            ? undefined
            : Number(values.salePrice),
        notes: values.notes || undefined,
        status: values.status,
      };

      const product = isEdit
        ? await updateProduct(id as string, payload)
        : await createProduct(payload);

      if (newFiles.length > 0) {
        await uploadPhotos(
          product.id,
          newFiles.map((f) => f.file)
        );
      }
      return product;
    },
    {
      onSuccess: (product) => {
        toast.success(isEdit ? 'Produto atualizado!' : 'Produto criado!');
        queryClient.invalidateQueries('products');
        queryClient.invalidateQueries(['product', product.id]);
        navigate(`/produtos/${product.id}`);
      },
      onError: () => {
        toast.error('Não foi possível salvar o produto.');
      },
    }
  );

  const removePhotoMutation = useMutation(
    (photoId: string) => deletePhoto(id as string, photoId),
    {
      onSuccess: () => {
        toast.success('Foto removida.');
        queryClient.invalidateQueries(['product', id]);
      },
    }
  );

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const previews = Array.from(files).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setNewFiles((prev) => [...prev, ...previews]);
  };

  const statusOptions = (Object.keys(productStatusConfig) as ProductStatus[]).map(
    (s) => ({ value: s, label: productStatusConfig[s].label })
  );

  if (isEdit && loadingProduct) {
    return <Spinner className="py-20" label="Carregando..." />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h2 className="text-2xl font-bold text-gray-900">
        {isEdit ? 'Editar Produto' : 'Novo Produto'}
      </h2>

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nome do produto"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Código — opcional"
            error={errors.code?.message}
            {...register('code')}
          />
          <Select
            label="Categoria"
            placeholder="Selecione..."
            error={errors.categoryId?.message}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            {...register('categoryId')}
          />
          <Select
            label="Status"
            options={statusOptions}
            error={errors.status?.message}
            {...register('status')}
          />
          <Input
            label="Tamanho"
            error={errors.size?.message}
            {...register('size')}
          />
          <Input
            label="Cor"
            error={errors.color?.message}
            {...register('color')}
          />
          <Input
            label="Preço de locação (R$)"
            type="number"
            step="0.01"
            error={errors.rentalPrice?.message}
            {...register('rentalPrice')}
          />
          <Input
            label="Preço de venda (R$) — opcional"
            type="number"
            step="0.01"
            error={errors.salePrice?.message as string | undefined}
            {...register('salePrice')}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Observações
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            {...register('notes')}
          />
        </div>

        {/* Photos */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Fotos
          </label>

          {isEdit && existing?.photos && existing.photos.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-3">
              {existing.photos.map((photo) => (
                <div key={photo.id} className="relative h-24 w-20">
                  <img
                    src={photo.url}
                    alt=""
                    className="h-full w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhotoMutation.mutate(photo.id)}
                    className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {newFiles.map((f, i) => (
              <div key={i} className="relative h-24 w-20">
                <img
                  src={f.url}
                  alt=""
                  className="h-full w-full rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setNewFiles((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="flex h-24 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-primary-400 hover:text-primary-500">
              <Upload className="h-5 w-5" />
              <span className="text-[10px]">Adicionar</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isLoading}>
            {isEdit ? 'Salvar alterações' : 'Criar produto'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProductForm;
