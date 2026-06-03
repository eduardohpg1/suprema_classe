import { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Plus,
  ImageOff,
  Tag,
  Ruler,
  Palette,
} from 'lucide-react';
import { getProduct } from '../../api/products';
import { getRentals } from '../../api/rentals';
import { ProductCalendar } from '../../components/ProductCalendar';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Card } from '../../components/UI/Card';
import { Spinner } from '../../components/UI/Spinner';
import { Table, Column } from '../../components/UI/Table';
import { productStatusConfig, rentalStatusConfig } from '../../lib/statusConfig';
import { formatCurrency, formatDate } from '../../lib/format';
import { Rental } from '../../types';

export function ProductDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [activePhoto, setActivePhoto] = useState(0);

  const { data: product, isLoading } = useQuery(['product', id], () =>
    getProduct(id)
  );

  const { data: rentals } = useQuery(
    ['product-rentals', id],
    () => getRentals({ pageSize: 5 }),
    { enabled: !!id }
  );

  if (isLoading || !product) {
    return <Spinner className="py-20" label="Carregando produto..." />;
  }

  const status = productStatusConfig[product.status];
  const photos = product.photos ?? [];
  const current = photos[activePhoto];

  const upcomingRentals = (rentals?.data ?? []).filter(
    (r) => r.product?.id === product.id && r.status === 'ACTIVE'
  );

  const rentalColumns: Column<Rental>[] = [
    { key: 'customer', header: 'Cliente', render: (r) => r.customer?.name },
    {
      key: 'pickup',
      header: 'Retirada',
      render: (r) => formatDate(r.pickupDate),
    },
    {
      key: 'return',
      header: 'Devolução',
      render: (r) => formatDate(r.returnDate),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const s = rentalStatusConfig[r.status];
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/produtos')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para produtos
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-100">
            {current ? (
              <img
                src={current.url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-300">
                <ImageOff className="h-12 w-12" />
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {photos.map((photo, i) => (
                <button
                  key={photo.id}
                  onClick={() => setActivePhoto(i)}
                  className={`h-20 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    i === activePhoto
                      ? 'border-primary-500'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-400">{product.code}</p>
                <h2 className="text-2xl font-bold text-gray-900">
                  {product.name}
                </h2>
              </div>
              <Badge variant={status.variant} dot>
                {status.label}
              </Badge>
            </div>
            <p className="mt-3 text-3xl font-bold text-primary-600">
              {formatCurrency(product.rentalPrice)}
              <span className="text-sm font-normal text-gray-400">
                {' '}
                /locação
              </span>
            </p>
          </div>

          <Card className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">Categoria:</span>
              <span className="font-medium">{product.category?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Ruler className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">Tamanho:</span>
              <span className="font-medium">{product.size}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">Cor:</span>
              <span className="font-medium capitalize">{product.color}</span>
            </div>
            {product.salePrice != null && (
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Venda:</span>
                <span className="font-medium">
                  {formatCurrency(product.salePrice)}
                </span>
              </div>
            )}
          </Card>

          {product.notes && (
            <Card>
              <p className="mb-1 text-xs font-medium uppercase text-gray-400">
                Observações
              </p>
              <p className="text-sm text-gray-700">{product.notes}</p>
            </Card>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              fullWidth
              onClick={() =>
                navigate(`/locacoes/nova?productId=${product.id}`)
              }
            >
              <Plus className="h-4 w-4" /> Nova Locação
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => navigate(`/produtos/${product.id}/editar`)}
            >
              <Pencil className="h-4 w-4" /> Editar Produto
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">
          Disponibilidade
        </h3>
        <div className="max-w-sm rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <ProductCalendar
            productId={product.id}
            onDateClick={() =>
              navigate(`/locacoes/nova?productId=${product.id}`)
            }
          />
        </div>
      </div>

      {/* Próximas locações */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">
          Próximas locações
        </h3>
        <Table
          columns={rentalColumns}
          data={upcomingRentals}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/locacoes/${r.id}`)}
          empty="Nenhuma locação ativa para este produto."
        />
      </div>
    </div>
  );
}

export default ProductDetail;
