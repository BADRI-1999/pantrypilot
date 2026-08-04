import express from 'express';
import cors from 'cors';
import os from 'node:os';
import { env } from './env.js';
import { uploadsDir } from './upload.js';
import { receiptsRouter } from './routes/receipts.js';
import { inventoryRouter } from './routes/inventory.js';
import { foodEntitiesRouter } from './routes/foodEntities.js';
import { recipesRouter } from './routes/recipes.js';
import { mealsRouter } from './routes/meals.js';
import { shoppingRouter } from './routes/shopping.js';
import { householdRouter } from './routes/household.js';

const app = express();

// Collect this machine's LAN IPv4 addresses (for the phone-on-Wi-Fi hint).
function lanIPs(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((n): n is os.NetworkInterfaceInfo => Boolean(n) && n!.family === 'IPv4' && !n!.internal)
    .map((n) => n.address);
}

// Allow the configured origins plus any localhost / private-LAN origin, so the
// app works from your PC and from a phone on the same Wi-Fi without extra config.
const lanOrigin =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/;
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // same-origin, curl, native apps
      if (env.corsOrigins.includes(origin) || lanOrigin.test(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
  }),
);
app.use(express.json({ limit: '5mb' }));

// Serve uploaded receipt/meal images.
app.use('/uploads', express.static(uploadsDir));

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'pantryiq-api',
    message: 'PantryIQ API is running.',
    routes: ['/health', '/api/*'],
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, openai: env.hasOpenAI, service: 'pantryiq-api' });
});

app.use('/api/receipts', receiptsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/food-entities', foodEntitiesRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/meals', mealsRouter);
app.use('/api/shopping', shoppingRouter);
app.use('/api/household', householdRouter);

// Centralised error handler.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
});

app.listen(env.port, () => {
  console.log(`PantryIQ API listening on http://localhost:${env.port}`);
  for (const ip of lanIPs()) {
    console.log(`  on your network:           http://${ip}:${env.port}`);
  }
  console.log(`OpenAI: ${env.hasOpenAI ? 'enabled' : 'disabled (heuristic fallback)'}`);
});
