import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProductList } from './pages/Products/ProductList';
import { ProductDetail } from './pages/Products/ProductDetail';
import { ProductForm } from './pages/Products/ProductForm';
import { CustomerList } from './pages/Customers/CustomerList';
import { CustomerForm } from './pages/Customers/CustomerForm';
import { RentalList } from './pages/Rentals/RentalList';
import { RentalDetail } from './pages/Rentals/RentalDetail';
import { RentalForm } from './pages/Rentals/RentalForm';
import { Reports } from './pages/Reports';
import { Search } from './pages/Search';

export default function App() {
  return (
    <Routes>
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
    </Routes>
  );
}
