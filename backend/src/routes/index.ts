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

// Diagnostico TEMPORARIO de banco/engine (remover apos resolver o deploy).
router.get('/health/db', async (_req, res) => {
  const diag: Record<string, unknown> = {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasDirectUrl: Boolean(process.env.DIRECT_URL),
    databaseUrlPrefix: process.env.DATABASE_URL?.slice(0, 24) ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
    isVercel: Boolean(process.env.VERCEL),
    cwd: process.cwd(),
  };
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const dir = path.join(process.cwd(), 'node_modules/.prisma/client');
    diag.engineDir = dir;
    diag.engineDirExists = fs.existsSync(dir);
    diag.engines = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => f.includes('engine') || f.endsWith('.node') || f.endsWith('.so.node'))
      : null;
  } catch (e) {
    diag.enginesError = (e as Error).message;
  }
  const { prisma } = await import('../prisma');
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    diag.rawQuery = 'OK';
  } catch (e) {
    const err = e as { name?: string; message?: string; code?: string };
    diag.rawQuery = 'FALHOU';
    diag.rawError = `${err.name}: ${(err.message ?? '').slice(0, 400)}`;
  }
  try {
    diag.userCount = await prisma.user.count();
  } catch (e) {
    const err = e as { name?: string; message?: string; code?: string };
    diag.userCount = 'FALHOU';
    diag.userCountError = `${err.name} [${err.code}]: ${(err.message ?? '').slice(0, 400)}`;
  }
  // Reproduz o fluxo completo do login, etapa por etapa.
  try {
    const bcrypt = (await import('bcryptjs')).default;
    const { signToken } = await import('../middleware/auth');

    const u = await prisma.user.findUnique({ where: { email: 'admin@supremaclasse.com' } });
    diag.step_findUnique = u ? 'OK (achou)' : 'NAO achou';

    if (u) {
      const valid = await bcrypt.compare('admin123', u.password);
      diag.step_bcrypt = valid ? 'OK (senha confere)' : 'senha NAO confere';

      const token = signToken({ sub: u.id, email: u.email, role: u.role });
      diag.step_signToken = token ? `OK (len ${token.length})` : 'FALHOU';
    }
    diag.loginFlow = 'OK';
  } catch (e) {
    const err = e as { name?: string; message?: string; code?: string; stack?: string };
    diag.loginFlow = 'FALHOU';
    diag.loginError = `${err.name} [${err.code ?? '-'}]: ${(err.message ?? '').slice(0, 400)}`;
    diag.loginStack = (err.stack ?? '').slice(0, 700);
  }
  res.json(diag);
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
