import { Router } from 'express';
import { listCases, createCase, getCase } from '../controllers/caseController.js';
import { uploadEvidence } from '../controllers/evidenceController.js';

const router = Router();

// Cases
router.get('/', listCases);
router.post('/', createCase);
router.get('/:id', getCase);

// Evidence (nested under a case)
router.post('/:id/evidence', uploadEvidence);

export default router;
