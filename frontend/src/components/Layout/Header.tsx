import { useNavigate } from 'react-router-dom';
import { Menu, Search, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('Sessão encerrada.');
    // Recarrega a página para garantir limpeza completa do estado
    window.location.href = '/login';
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 lg:text-xl">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/busca')}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-100"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Busca rápida</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-gray-900">
              {user?.name || 'Usuário'}
            </p>
            <p className="text-xs text-gray-400">
              {user?.role === 'ADMIN' ? 'Administrador' : 'Operador'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
