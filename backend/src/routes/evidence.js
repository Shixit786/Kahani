import { Router } from 'express';
import { getEvidence } from '../controllers/evidenceController.js';
import { addCustodyEvent } from '../controllers/custodyController.js';
import { verifyFile, verifyChain } from '../controllers/verifyController.js';
import { getCertificate } from '../controllers/certController.js';

const router = Router();

// Evidence detail
router.get('/:id', getEvidence);

// Custody events
router.post('/:id/events', addCustodyEvent);

// Integrity checks
router.post('/:id/verify-file', verifyFile);
router.get('/:id/verify-chain', verifyChain);

// Section 63 BSA certificate PDF
router.get('/:id/certificate', getCertificate);

export default router;
