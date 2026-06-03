import path from 'node:path';
import express, { Application } from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { absoluteUploadDir } from './middleware/upload';

export function createApp(): Application {
  const app = express();

  // CORS — origem configuravel via env (default: aceita qualquer origem em dev).
  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(
    cors({
      origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
      credentials: true,
    }),
  );

  // Parsers.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Arquivos estaticos de upload (fotos dos produtos).
  app.use('/uploads', express.static(absoluteUploadDir));

  // API versionada.
  app.use('/api', routes);

  // 404 e handler global de erros (devem ser os ultimos).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;

// Referencia explicita para evitar erro de import nao utilizado em alguns setups.
export const UPLOADS_PATH = path.basename(absoluteUploadDir);
