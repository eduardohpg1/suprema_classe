import 'dotenv/config';
import { createApp } from './app';
import { prisma } from './prisma';

const app = createApp();

// Vercel serverless — exporta o app diretamente
export default app;

// Desenvolvimento local — inicia o servidor
if (process.env.NODE_ENV !== 'production') {
  const PORT = Number(process.env.PORT ?? 3001);

  prisma.$connect()
    .then(() => {
      console.log('[db] Conexao com PostgreSQL estabelecida.');
      app.listen(PORT, () => {
        console.log(`[server] Suprema Classe backend rodando em http://localhost:${PORT}`);
        console.log(`[server] Healthcheck: http://localhost:${PORT}/api/health`);
      });
    })
    .catch((err) => {
      console.error('[db] Falha ao conectar no banco de dados:', err);
      process.exit(1);
    });
}
