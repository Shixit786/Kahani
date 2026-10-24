import { Router } from 'express';
import { tamper } from '../controllers/demoController.js';

const router = Router();

// POST /api/demo/tamper/:evidenceId
// Only works when DEMO_MODE=true — mutates seqNo 2 without rehashing
router.post('/tamper/:evidenceId', tamper);

export default router;
