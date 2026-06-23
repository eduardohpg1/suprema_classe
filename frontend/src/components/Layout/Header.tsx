import { useNavigate } from 'react-router-dom';
import { Menu, Search, LogOut, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  dark: boolean;
  onToggleDark: () => void;
}

export function Header({ title, onMenuClick, dark, onToggleDark }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('Sessão encerrada.');
    window.location.href = '/login';
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Busca */}
        <button
          onClick={() => navigate('/busca')}
          className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Busca rápida"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Busca</span>
        </button>

        {/* Toggle dark/light */}
        <button
          onClick={onToggleDark}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-yellow-400 transition hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          title={dark ? 'Modo claro' : 'Modo escuro'}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Avatar + nome + logout */}
        <div className="flex items-center gap-2 pl-1 border-l border-gray-200 dark:border-gray-700 ml-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
            {initials}
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
              {user?.name || 'Usuário'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user?.role === 'ADMIN' ? 'Administrador' : 'Operador'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
