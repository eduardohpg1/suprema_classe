import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  PackageOpen,
  CalendarClock,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { getDashboard } from '../api/dashboard';
import { Card } from '../components/UI/Card';
import { Table, Column } from '../components/UI/Table';
import { Spinner } from '../components/UI/Spinner';
import { Badge } from '../components/UI/Badge';
import { Rental } from '../types';
import { formatCurrency, formatDateOnly } from '../lib/format';
import { rentalStatusConfig } from '../lib/statusConfig';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
  onClick?: () => void;
}

function MetricCard({ label, value, icon, accent, onClick }: MetricCardProps) {
  return (
    <Card
      className={`flex items-center gap-4 transition ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}`}
      onClick={onClick}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      {onClick && <span className="ml-auto text-xs text-gray-400">Ver →</span>}
    </Card>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery('dashboard', getDashboard);

  const rentalColumns: Column<Rental>[] = [
    {
      key: 'product',
      header: 'Produto',
      render: (r) => (
        <span className="font-medium text-gray-900">{r.product?.name}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      render: (r) => r.customer?.name,
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
  ];

  if (isLoading) {
    return <Spinner className="py-20" label="Carregando dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Peças disponíveis"
          value={data?.totalAvailable ?? 0}
          accent="bg-green-100 text-green-600"
          icon={<CheckCircle2 className="h-6 w-6" />}
          onClick={() => navigate('/produtos?status=AVAILABLE')}
        />
        <MetricCard
          label="Peças alugadas"
          value={data?.totalRented ?? 0}
          accent="bg-red-100 text-red-600"
          icon={<PackageOpen className="h-6 w-6" />}
          onClick={() => navigate('/produtos?status=RENTED')}
        />
        <MetricCard
          label="Locações ativas"
          value={data?.rentals?.active ?? 0}
          accent="bg-yellow-100 text-yellow-600"
          icon={<CalendarClock className="h-6 w-6" />}
          onClick={() => navigate('/locacoes?status=ACTIVE')}
        />
        <MetricCard
          label="Faturamento do mês"
          value={formatCurrency(data?.monthlyRevenue ?? 0)}
          accent="bg-blue-100 text-blue-600"
          icon={<DollarSign className="h-6 w-6" />}
          onClick={() => navigate('/relatorios')}
        />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-primary-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Retiradas Hoje
            </h2>
          </div>
          <Table
            columns={rentalColumns}
            data={data?.pickupToday ?? []}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/locacoes/${r.id}`)}
            empty="Nenhuma retirada agendada para hoje."
          />
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <ArrowDownLeft className="h-5 w-5 text-primary-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Devoluções Hoje
            </h2>
          </div>
          <Table
            columns={[
              ...rentalColumns.slice(0, 2),
              {
                key: 'returnDate',
                header: 'Devolução',
                render: (r) => formatDateOnly(r.returnDate),
              },
            ]}
            data={data?.returnToday ?? []}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/locacoes/${r.id}`)}
            empty="Nenhuma devolução agendada para hoje."
          />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
