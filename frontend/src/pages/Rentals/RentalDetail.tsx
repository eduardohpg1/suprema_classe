import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Printer,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getRental, returnRental, cancelRental } from '../../api/rentals';
import { generateContract } from '../../components/ContractPDF';
import { Button } from '../../components/UI/Button';
import { Badge } from '../../components/UI/Badge';
import { Card } from '../../components/UI/Card';
import { Spinner } from '../../components/UI/Spinner';
import { rentalStatusConfig } from '../../lib/statusConfig';
import {
  formatCurrency,
  formatDate,
  formatDateOnly,
  maskCPF,
  maskPhone,
} from '../../lib/format';

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between border-b border-gray-50 py-2 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value || '-'}</span>
    </div>
  );
}

export function RentalDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: rental, isLoading } = useQuery(['rental', id], () => getRental(id));

  const returnMutation = useMutation(() => returnRental(id), {
    onSuccess: () => {
      toast.success('Locação marcada como devolvida.');
      queryClient.invalidateQueries(['rental', id]);
      queryClient.invalidateQueries('rentals');
    },
    onError: () => toast.error('Não foi possível concluir a devolução.'),
  });

  const cancelMutation = useMutation(() => cancelRental(id), {
    onSuccess: () => {
      toast.success('Locação cancelada.');
      queryClient.invalidateQueries(['rental', id]);
      queryClient.invalidateQueries('rentals');
    },
    onError: () => toast.error('Não foi possível cancelar a locação.'),
  });

  if (isLoading || !rental) {
    return <Spinner className="py-20" label="Carregando locação..." />;
  }

  const status = rentalStatusConfig[rental.status];
  const mainItem = rental.items?.[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="no-print flex items-center justify-between">
        <button
          onClick={() => navigate('/locacoes')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para locações
        </button>
        <Badge variant={status.variant} dot>
          {status.label}
        </Badge>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Locação{mainItem ? ` · ${mainItem.product.name}` : ''}
        </h2>
        <p className="text-sm text-gray-400">Criada em {formatDate(rental.createdAt)}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">Cliente</h3>
          <InfoRow label="Nome" value={rental.customer?.name} />
          <InfoRow label="CPF" value={rental.customer?.cpf ? maskCPF(rental.customer.cpf) : '-'} />
          <InfoRow label="RG" value={rental.customer?.rg} />
          <InfoRow label="Telefone" value={rental.customer?.phone ? maskPhone(rental.customer.phone) : '-'} />
          <InfoRow label="Endereço" value={rental.customer?.address} />
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">Datas</h3>
          <InfoRow label="Retirada" value={formatDateOnly(rental.pickupDate)} />
          <InfoRow label="Devolução" value={formatDateOnly(rental.returnDate)} />
        </Card>

        {/* Itens da locação */}
        {rental.items && rental.items.length > 0 && (
          <Card className="md:col-span-2">
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">
              Itens da Locação
            </h3>
            <div className="divide-y divide-gray-50">
              {rental.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.product.code} · Tam. {item.product.size} · {item.product.color}
                    </p>
                  </div>
                  <div className="text-right">
                    {item.quantity > 1 && (
                      <p className="text-xs text-gray-400">{item.quantity}× {formatCurrency(item.unitPrice)}</p>
                    )}
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(Number(item.unitPrice) * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="md:col-span-2">
          <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">Valores</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Valor total</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(rental.totalValue)}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-xs text-gray-500">Sinal pago</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(rental.depositValue)}</p>
            </div>
            <div className="rounded-xl bg-primary-50 p-4">
              <p className="text-xs text-gray-500">Restante</p>
              <p className="text-xl font-bold text-primary-700">{formatCurrency(rental.remainingValue)}</p>
            </div>
          </div>
          {rental.notes && (
            <p className="mt-4 text-sm text-gray-600">
              <span className="font-medium">Observações:</span> {rental.notes}
            </p>
          )}
        </Card>
      </div>

      {/* Actions */}
      <div className="no-print flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => generateContract(rental)}>
          <FileText className="h-4 w-4" /> Gerar Contrato PDF
        </Button>
        <Button variant="outline" onClick={() => generateContract(rental, 'print')}>
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
        {rental.status === 'ACTIVE' && (
          <>
            <Button
              variant="secondary"
              loading={returnMutation.isLoading}
              onClick={() => returnMutation.mutate()}
            >
              <CheckCircle2 className="h-4 w-4" /> Marcar como Devolvido
            </Button>
            <Button
              variant="danger"
              loading={cancelMutation.isLoading}
              onClick={() => cancelMutation.mutate()}
            >
              <XCircle className="h-4 w-4" /> Cancelar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default RentalDetail;
