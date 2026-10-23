import express          from 'express';
import cors             from 'cors';
import { iniciarBD }    from './db/database.js';
import { seedIfEmpty }  from './db/seed.js';
import rutas             from './routes/index.js';

const app    = express();
const PUERTO = process.env.PORT || 3000;

app.use(cors({ origin: ['http://localhost:4200', 'http://localhost:4201'] }));
app.use(express.json());

await iniciarBD();
seedIfEmpty();

app.use('/api', rutas);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ mensaje: 'Error interno del servidor' });
});

app.listen(PUERTO, () => {
  console.log(`\n  StockFlow — Gestión de almacén`);
  console.log(`  API disponible en http://localhost:${PUERTO}/api\n`);
});
