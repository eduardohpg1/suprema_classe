import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Eye,
  FileText,
  CheckCircle2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getRentals, returnRental } from '../../api/rentals';
import { generateContract } from '../../components/ContractPDF';
import { Button } from '../../components/UI/Button';
import { Select } from '../../components/UI/Select';
import { Input } from '../../components/UI/Input';
import { Spinner } from '../../components/UI/Spinner';
import { Table, Column } from '../../components/UI/Table';
import { Badge } from '../../components/UI/Badge';
import { EmptyState } from '../../components/UI/EmptyState';
import { Rental, RentalStatus } from '../../types';
import { rentalStatusConfig } from '../../lib/statusConfig';
import { formatCurrency, formatDateOnly } from '../../lib/format';

export function RentalList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<RentalStatus | ''>((searchParams.get('status') as RentalStatus) || '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery(
    ['rentals', status, from, to, page],
    () => getRentals({ status, from, to, page, pageSize: 20 }),
    { keepPreviousData: true }
  );

  const returnMutation = useMutation((id: string) => returnRental(id), {
    onSuccess: () => {
      toast.success('Locação marcada como devolvida.');
      queryClient.invalidateQueries('rentals');
    },
    onError: () => {
      toast.error('Não foi possível concluir a devolução.');
    },
  });

  const statusOptions = (Object.keys(rentalStatusConfig) as RentalStatus[]).map(
    (s) => ({ value: s, label: rentalStatusConfig[s].label })
  );

  const columns: Column<Rental>[] = [
    {
      key: 'product',
      header: 'Produto',
      render: (r) => (
        <span className="font-medium text-gray-900">{r.product?.name}</span>
      ),
    },
    { key: 'customer', header: 'Cliente', render: (r) => r.customer?.name },
    {
      key: 'pickup',
      header: 'Retirada',
      render: (r) => formatDateOnly(r.pickupDate),
    },
    {
      key: 'return',
      header: 'Devolução',
      render: (r) => formatDateOnly(r.returnDate),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (r) => formatCurrency(r.totalValue),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const s = rentalStatusConfig[r.status];
        return (
          <Badge variant={s.variant} dot>
            {s.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <button
            title="Ver detalhes"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/locacoes/${r.id}`);
            }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            title="Gerar contrato"
            onClick={(e) => {
              e.stopPropagation();
              generateContract(r);
            }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600"
          >
            <FileText className="h-4 w-4" />
          </button>
          {r.status === 'ACTIVE' && (
            <button
              title="Marcar como devolvido"
              onClick={(e) => {
                e.stopPropagation();
                returnMutation.mutate(r.id);
              }}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-green-600"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {data ? `${data.total} locação(ões)` : 'Carregando...'}
        </p>
        <Button onClick={() => navigate('/locacoes/nova')}>
          <Plus className="h-4 w-4" /> Nova Locação
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select
          placeholder="Todos os status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as RentalStatus | '');
            setPage(1);
          }}
          options={statusOptions}
        />
        <Input
          type="date"
          label=""
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {isLoading ? (
        <Spinner className="py-20" label="Carregando locações..." />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-7 w-7" />}
          title="Nenhuma locação encontrada"
          description="Crie uma nova locação para começar."
          action={
            <Button onClick={() => navigate('/locacoes/nova')}>
              <Plus className="h-4 w-4" /> Nova Locação
            </Button>
          }
        />
      ) : (
        <>
          <Table
            columns={columns}
            data={data.data}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/locacoes/${r.id}`)}
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
  );
}

export default RentalList;
