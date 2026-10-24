import { Router } from 'express';
import casesRouter from './cases.js';
import evidenceRouter from './evidence.js';
import demoRouter from './demo.js';

import { handleCapture } from '../controllers/captureController.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => res.json({ ok: true }));

// Resource routers
router.use('/cases', casesRouter);
router.use('/evidence', evidenceRouter);
router.use('/demo', demoRouter);

// Chrome extension live capture
router.post('/capture', handleCapture);

export default router;

