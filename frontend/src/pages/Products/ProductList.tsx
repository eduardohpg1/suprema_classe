import { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Shirt, ChevronLeft, ChevronRight } from 'lucide-react';
import { getProducts, getCategories } from '../../api/products';
import { useDebounce } from '../../hooks/useDebounce';
import { ProductCard } from '../../components/ProductCard';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Spinner } from '../../components/UI/Spinner';
import { EmptyState } from '../../components/UI/EmptyState';
import { ProductStatus } from '../../types';
import { productStatusConfig } from '../../lib/statusConfig';

export function ProductList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>((searchParams.get('status') as ProductStatus) || '');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const { data: categories = [] } = useQuery('categories', getCategories, {
    staleTime: 5 * 60_000,
  });

  const { data, isLoading } = useQuery(
    ['products', debouncedSearch, categoryId, status, page],
    () =>
      getProducts({
        search: debouncedSearch,
        categoryId,
        status,
        page,
        pageSize: 12,
      }),
    { keepPreviousData: true }
  );

  const statusOptions = (Object.keys(productStatusConfig) as ProductStatus[]).map(
    (s) => ({ value: s, label: productStatusConfig[s].label })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {data ? `${data.total} produto(s) cadastrado(s)` : 'Carregando...'}
        </p>
        <Button onClick={() => navigate('/produtos/novo')} size="lg">
          <Plus className="h-5 w-5" /> Novo Produto
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          placeholder="Buscar por nome ou código..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          icon={<Search className="h-4 w-4" />}
        />
        <Select
          placeholder="Todas as categorias"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Select
          placeholder="Todos os status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ProductStatus | '');
            setPage(1);
          }}
          options={statusOptions}
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <Spinner className="py-20" label="Carregando produtos..." />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          icon={<Shirt className="h-7 w-7" />}
          title="Nenhum produto encontrado"
          description="Ajuste os filtros ou cadastre um novo produto para começar."
          action={
            <Button onClick={() => navigate('/produtos/novo')}>
              <Plus className="h-4 w-4" /> Novo Produto
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <span className="text-sm text-gray-500">
                Página {data.page} de {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProductList;
