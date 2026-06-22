import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { Plus, Trash2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAccessories, createAccessory, deleteAccessory } from '../../api/accessories';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Modal } from '../../components/UI/Modal';
import { Spinner } from '../../components/UI/Spinner';
import { Accessory } from '../../types';

export function AccessoryList() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [toDelete, setToDelete] = useState<Accessory | null>(null);

  const { data: accessories = [], isLoading } = useQuery('accessories', getAccessories);

  const createMutation = useMutation((name: string) => createAccessory(name), {
    onSuccess: () => {
      toast.success('Acessório cadastrado.');
      queryClient.invalidateQueries('accessories');
      setNewName('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Erro ao cadastrar acessório.');
    },
  });

  const deleteMutation = useMutation((id: string) => deleteAccessory(id), {
    onSuccess: () => {
      toast.success('Acessório excluído.');
      queryClient.invalidateQueries('accessories');
      setToDelete(null);
    },
    onError: () => {
      toast.error('Erro ao excluir acessório.');
    },
  });

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate(name);
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Acessórios</h2>
      <p className="text-sm text-gray-500">
        Cadastre aqui os itens extras que saem junto com as locações, como gravatas, camisas e suspensórios.
      </p>

      {/* Formulário de adição */}
      <div className="flex gap-2">
        <Input
          placeholder="Nome do acessório (ex: Gravata Preta)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd} loading={createMutation.isLoading} disabled={!newName.trim()}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <Spinner className="py-10" label="Carregando acessórios..." />
      ) : accessories.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center">
          <Tag className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Nenhum acessório cadastrado</p>
          <p className="text-xs text-gray-400">Adicione itens como gravata, camisa, suspensório...</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {accessories.map((acc, i) => (
            <div
              key={acc.id}
              className={`flex items-center justify-between px-4 py-3 text-sm ${
                i < accessories.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <span className="font-medium text-gray-900">{acc.name}</span>
              <button
                onClick={() => setToDelete(acc)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Excluir acessório"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleteMutation.isLoading}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              disabled={deleteMutation.isLoading}
            >
              {deleteMutation.isLoading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Tem certeza que deseja excluir{' '}
          <span className="font-semibold text-gray-900">{toDelete?.name}</span>?
          Ele será removido de novas locações, mas locações existentes não serão afetadas.
        </p>
      </Modal>
    </div>
  );
}

export default AccessoryList;
