import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Shirt,
  Users,
  CalendarClock,
  Search,
  X,
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/produtos', label: 'Produtos', icon: Shirt },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/locacoes', label: 'Locações', icon: CalendarClock },
  { to: '/busca', label: 'Busca', icon: Search },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gray-950 dark:bg-gray-900 border-r border-gray-800 text-gray-300 transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-lg shadow-primary-900/40">
              <Shirt className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-bold text-white">Suprema Classe</p>
              <p className="text-xs text-gray-500">Locação de vestidos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-white lg:hidden transition"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm shadow-primary-900/50'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800 px-5 py-4">
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} Suprema Classe</p>
          <p className="text-xs text-gray-700">Caçapava/SP</p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
