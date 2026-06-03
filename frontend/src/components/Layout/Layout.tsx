import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const titleMap: { match: (path: string) => boolean; title: string }[] = [
  { match: (p) => p === '/', title: 'Dashboard' },
  { match: (p) => p.startsWith('/produtos'), title: 'Produtos' },
  { match: (p) => p.startsWith('/clientes'), title: 'Clientes' },
  { match: (p) => p.startsWith('/locacoes'), title: 'Locações' },
  { match: (p) => p.startsWith('/relatorios'), title: 'Relatórios' },
  { match: (p) => p.startsWith('/busca'), title: 'Busca Global' },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title =
    titleMap.find((t) => t.match(location.pathname))?.title || 'Suprema Classe';

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
