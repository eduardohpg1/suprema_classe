import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import authRoutes from './auth.routes';
import categoriesRoutes from './categories.routes';
import productsRoutes from './products.routes';
import customersRoutes from './customers.routes';
import rentalsRoutes from './rentals.routes';
import reservationsRoutes from './reservations.routes';
import availabilityRoutes from './availability.routes';
import dashboardRoutes from './dashboard.routes';
import searchRoutes from './search.routes';
import reportsRoutes from './reports.routes';

const router = Router();

// Healthcheck publico.
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'suprema-classe-backend', time: new Date().toISOString() });
});

// Rotas de autenticacao (login publico; register/me protegidos internamente).
router.use('/auth', authRoutes);

// Rotas de negocio (autenticacao desabilitada temporariamente).
router.use('/categories', categoriesRoutes);
router.use('/products', productsRoutes);
router.use('/customers', customersRoutes);
router.use('/rentals', rentalsRoutes);
router.use('/reservations', reservationsRoutes);
router.use('/availability', availabilityRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/search', searchRoutes);
router.use('/reports', reportsRoutes);

export default router;
