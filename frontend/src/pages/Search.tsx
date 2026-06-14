import { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Shirt, Users, CalendarClock } from 'lucide-react';
import { globalSearch } from '../api/reports';
import { useDebounce } from '../hooks/useDebounce';
import { Input } from '../components/UI/Input';
import { Spinner } from '../components/UI/Spinner';
import { Badge } from '../components/UI/Badge';
import { EmptyState } from '../components/UI/EmptyState';
import { productStatusConfig, rentalStatusConfig } from '../lib/statusConfig';
import { formatCurrency, formatDateOnly, maskCPF } from '../lib/format';

export function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 400);

  const { data, isLoading, isFetching } = useQuery(
    ['global-search', debounced],
    () => globalSearch(debounced),
    { enabled: debounced.trim().length >= 2, keepPreviousData: true }
  );

  const hasResults =
    data &&
    (data.customers.length > 0 ||
      data.products.length > 0 ||
      data.rentals.length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Input
        autoFocus
        placeholder="Buscar clientes, produtos ou locações..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        icon={<SearchIcon className="h-4 w-4" />}
      />

      {debounced.trim().length < 2 ? (
        <EmptyState
          icon={<SearchIcon className="h-7 w-7" />}
          title="Digite para buscar"
          description="Pesquise por nome de cliente, CPF, nome ou código de produto, ou locações."
        />
      ) : isLoading || isFetching ? (
        <Spinner className="py-16" label="Buscando..." />
      ) : !hasResults ? (
        <EmptyState
          icon={<SearchIcon className="h-7 w-7" />}
          title="Nenhum resultado"
          description={`Nada encontrado para "${debounced}".`}
        />
      ) : (
        <div className="space-y-6">
          {/* Clientes */}
          {data!.customers.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Users className="h-4 w-4 text-primary-600" /> Clientes
              </div>
              <div className="space-y-2">
                {data!.customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/clientes/${c.id}/editar`)}
                    className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-primary-50/40"
                  >
                    <span className="font-medium text-gray-900">{c.name}</span>
                    <span className="text-sm text-gray-400">
                      {maskCPF(c.cpf)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Produtos */}
          {data!.products.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Shirt className="h-4 w-4 text-primary-600" /> Produtos
              </div>
              <div className="space-y-2">
                {data!.products.map((p) => {
                  const s = productStatusConfig[p.status];
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/produtos/${p.id}`)}
                      className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-primary-50/40"
                    >
                      <div>
                        <span className="font-medium text-gray-900">
                          {p.name}
                        </span>
                        <span className="ml-2 text-sm text-gray-400">
                          {p.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-primary-600">
                          {formatCurrency(p.rentalPrice)}
                        </span>
                        <Badge variant={s.variant} dot>
                          {s.label}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Locações */}
          {data!.rentals.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <CalendarClock className="h-4 w-4 text-primary-600" /> Locações
              </div>
              <div className="space-y-2">
                {data!.rentals.map((r) => {
                  const s = rentalStatusConfig[r.status];
                  return (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/locacoes/${r.id}`)}
                      className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-primary-50/40"
                    >
                      <div>
                        <span className="font-medium text-gray-900">
                          {r.product?.name}
                        </span>
                        <span className="ml-2 text-sm text-gray-400">
                          {r.customer?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">
                          {formatDateOnly(r.pickupDate)}
                        </span>
                        <Badge variant={s.variant} dot>
                          {s.label}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default Search;
