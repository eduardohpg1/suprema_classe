import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ProductList } from './pages/Products/ProductList';
import { ProductDetail } from './pages/Products/ProductDetail';
import { ProductForm } from './pages/Products/ProductForm';
import { CustomerList } from './pages/Customers/CustomerList';
import { CustomerForm } from './pages/Customers/CustomerForm';
import { RentalList } from './pages/Rentals/RentalList';
import { RentalDetail } from './pages/Rentals/RentalDetail';
import { RentalForm } from './pages/Rentals/RentalForm';
import { AccessoryList } from './pages/Accessories/AccessoryList';
import { Reports } from './pages/Reports';
import { Search } from './pages/Search';
import { useAuth } from './hooks/useAuth';
import { Spinner } from './components/UI/Spinner';

function PrivateRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner label="Carregando..." />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Route element={<Layout />}>
      <Route path="/" element={<Dashboard />} />

      <Route path="/produtos" element={<ProductList />} />
      <Route path="/produtos/novo" element={<ProductForm />} />
      <Route path="/produtos/:id" element={<ProductDetail />} />
      <Route path="/produtos/:id/editar" element={<ProductForm />} />

      <Route path="/clientes" element={<CustomerList />} />
      <Route path="/clientes/novo" element={<CustomerForm />} />
      <Route path="/clientes/:id/editar" element={<CustomerForm />} />

      <Route path="/locacoes" element={<RentalList />} />
      <Route path="/locacoes/nova" element={<RentalForm />} />
      <Route path="/locacoes/:id" element={<RentalDetail />} />

      <Route path="/relatorios" element={<Reports />} />
      <Route path="/busca" element={<Search />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner label="Carregando..." />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      {user ? (
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />

          <Route path="/produtos" element={<ProductList />} />
          <Route path="/produtos/novo" element={<ProductForm />} />
          <Route path="/produtos/:id" element={<ProductDetail />} />
          <Route path="/produtos/:id/editar" element={<ProductForm />} />

          <Route path="/clientes" element={<CustomerList />} />
          <Route path="/clientes/novo" element={<CustomerForm />} />
          <Route path="/clientes/:id/editar" element={<CustomerForm />} />

          <Route path="/locacoes" element={<RentalList />} />
          <Route path="/locacoes/nova" element={<RentalForm />} />
          <Route path="/locacoes/:id" element={<RentalDetail />} />

          <Route path="/acessorios" element={<AccessoryList />} />

          <Route path="/relatorios" element={<Reports />} />
          <Route path="/busca" element={<Search />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}
