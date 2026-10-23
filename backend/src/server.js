import express          from 'express';
import cors             from 'cors';
import { existsSync }   from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { iniciarBD }    from './db/database.js';
import { seedIfEmpty }  from './db/seed.js';
import rutas             from './routes/index.js';

const app    = express();
const PUERTO = process.env.PORT || 3000;

const origenes = (process.env.CORS_ORIGINS || 'http://localhost:4200,http://localhost:4201')
  .split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({ origin: origenes }));
app.use(express.json());

await iniciarBD();
seedIfEmpty();

app.get('/api/salud', (_req, res) => res.json({ estado: 'ok' }));
app.use('/api', rutas);

// En producción la API sirve también el frontend Angular compilado
const __dir    = dirname(fileURLToPath(import.meta.url));
const RUTA_WEB = process.env.STOCKFLOW_WEB_DIR || join(__dir, '../public');
if (existsSync(join(RUTA_WEB, 'index.html'))) {
  app.use(express.static(RUTA_WEB));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(join(RUTA_WEB, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ mensaje: 'Error interno del servidor' });
});

app.listen(PUERTO, () => {
  console.log(`\n  StockFlow — Gestión de almacén`);
  console.log(`  API disponible en http://localhost:${PUERTO}/api\n`);
});
