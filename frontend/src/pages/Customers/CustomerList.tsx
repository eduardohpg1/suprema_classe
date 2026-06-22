import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { getCustomers, deleteCustomer } from '../../api/customers';
import { useDebounce } from '../../hooks/useDebounce';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Spinner } from '../../components/UI/Spinner';
import { Table, Column } from '../../components/UI/Table';
import { EmptyState } from '../../components/UI/EmptyState';
import { Modal } from '../../components/UI/Modal';
import { Customer } from '../../types';
import { formatDate, maskCPF, maskPhone } from '../../lib/format';

export function CustomerList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const { data, isLoading } = useQuery(
    ['customers', debouncedSearch, page],
    () => getCustomers({ search: debouncedSearch, page, pageSize: 20 }),
    { keepPreviousData: true }
  );

  const deleteMutation = useMutation(deleteCustomer, {
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      setCustomerToDelete(null);
    },
  });

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Nome',
      render: (c) => (
        <span className="font-medium text-gray-900">{c.name}</span>
      ),
    },
    { key: 'cpf', header: 'CPF', render: (c) => maskCPF(c.cpf) },
    { key: 'phone', header: 'Telefone', render: (c) => maskPhone(c.phone) },
    {
      key: 'rentals',
      header: 'Locações',
      align: 'center',
      render: (c) => c.rentalsCount ?? 0,
    },
    {
      key: 'createdAt',
      header: 'Cadastro',
      render: (c) => formatDate(c.createdAt),
    },
    {
      key: 'actions',
      header: '',
      align: 'center',
      render: (c) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCustomerToDelete(c);
          }}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          title="Excluir cliente"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <>
    <Modal
      open={!!customerToDelete}
      onClose={() => setCustomerToDelete(null)}
      title="Excluir cliente"
      size="sm"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => setCustomerToDelete(null)}
            disabled={deleteMutation.isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => customerToDelete && deleteMutation.mutate(customerToDelete.id)}
            disabled={deleteMutation.isLoading}
          >
            {deleteMutation.isLoading ? 'Excluindo...' : 'Excluir'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600">
        Tem certeza que deseja excluir o cliente{' '}
        <span className="font-semibold text-gray-900">{customerToDelete?.name}</span>?
        Esta ação não poderá ser desfeita.
      </p>
      {deleteMutation.isError && (
        <p className="mt-3 text-sm text-red-600">
          {(deleteMutation.error as any)?.response?.data?.message ??
            'Erro ao excluir cliente.'}
        </p>
      )}
    </Modal>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Buscar por nome ou CPF..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          icon={<Search className="h-4 w-4" />}
          className="sm:max-w-xs"
        />
        <Button onClick={() => navigate('/clientes/novo')}>
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      {isLoading ? (
        <Spinner className="py-20" label="Carregando clientes..." />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title="Nenhum cliente encontrado"
          description="Cadastre clientes para registrar locações."
          action={
            <Button onClick={() => navigate('/clientes/novo')}>
              <Plus className="h-4 w-4" /> Novo Cliente
            </Button>
          }
        />
      ) : (
        <>
          <Table
            columns={columns}
            data={data.data}
            rowKey={(c) => c.id}
            onRowClick={(c) => navigate(`/clientes/${c.id}/editar`)}
          />
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
    </>
  );
}

export default CustomerList;
