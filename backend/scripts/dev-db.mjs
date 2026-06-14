// Sobe um PostgreSQL local embarcado (sem Docker, sem instalacao) e o mantem vivo.
// Uso: node scripts/dev-db.mjs
import EmbeddedPostgres from 'embedded-postgres';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '..', '.pgdata');

const PORT = 5433;
const USER = 'suprema';
const PASSWORD = 'suprema';
const DB = 'suprema_classe';

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
});

async function main() {
  const fs = await import('node:fs');
  const alreadyInit = fs.existsSync(path.join(dataDir, 'PG_VERSION'));

  if (!alreadyInit) {
    console.log('[dev-db] Inicializando cluster PostgreSQL...');
    await pg.initialise();
  }

  console.log('[dev-db] Iniciando PostgreSQL na porta ' + PORT + '...');
  await pg.start();

  try {
    await pg.createDatabase(DB);
    console.log('[dev-db] Banco "' + DB + '" criado.');
  } catch (e) {
    console.log('[dev-db] Banco "' + DB + '" ja existe.');
  }

  console.log('[dev-db] PostgreSQL pronto: postgresql://' + USER + ':' + PASSWORD + '@localhost:' + PORT + '/' + DB);
  console.log('[dev-db] (deixe este processo rodando)');
}

async function shutdown() {
  console.log('\n[dev-db] Encerrando PostgreSQL...');
  try { await pg.stop(); } catch {}
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((err) => {
  console.error('[dev-db] Erro:', err);
  process.exit(1);
});
