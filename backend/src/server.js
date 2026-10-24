import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import apiRouter from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 5050;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/api', apiRouter);

// 404 — unknown routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ---------------------------------------------------------------------------
// Central error handler
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  const status = err.status ?? err.statusCode ?? 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[SERVER] Kahani backend running on http://localhost:${PORT}`);
    console.log(`[SERVER] Health → http://localhost:${PORT}/api/health`);
    console.log(`[SERVER] DEMO_MODE = ${process.env.DEMO_MODE}`);
  });
}

start().catch((err) => {
  console.error('[FATAL] Could not start server:', err.message);
  process.exit(1);
});
