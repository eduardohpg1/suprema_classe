import 'dotenv/config';
import { createApp } from './app';
import { prisma } from './prisma';

const PORT = Number(process.env.PORT ?? 3001);

async function bootstrap(): Promise<void> {
  // Valida conexao com o banco antes de aceitar requisicoes.
  try {
    await prisma.$connect();
    // eslint-disable-next-line no-console
    console.log('[db] Conexao com PostgreSQL estabelecida.');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db] Falha ao conectar no banco de dados:', err);
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] Suprema Classe backend rodando em http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`[server] Healthcheck: http://localhost:${PORT}/api/health`);
  });

  // Encerramento gracioso.
  const shutdown = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`\n[server] Recebido ${signal}, encerrando...`);
    server.close(async () => {
      await prisma.$disconnect();
      // eslint-disable-next-line no-console
      console.log('[server] Encerrado com sucesso.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
