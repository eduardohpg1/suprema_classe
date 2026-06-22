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

// Rotas de negocio protegidas por JWT.
router.use('/categories', authenticate, categoriesRoutes);
router.use('/products', authenticate, productsRoutes);
router.use('/customers', authenticate, customersRoutes);
router.use('/rentals', authenticate, rentalsRoutes);
router.use('/reservations', authenticate, reservationsRoutes);
router.use('/availability', authenticate, availabilityRoutes);
router.use('/dashboard', authenticate, dashboardRoutes);
router.use('/search', authenticate, searchRoutes);
router.use('/reports', authenticate, reportsRoutes);

export default router;
