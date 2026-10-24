import { Router } from 'express';
import { getEvidence } from '../controllers/evidenceController.js';
import { addCustodyEvent } from '../controllers/custodyController.js';
import { verifyFile, verifyChain } from '../controllers/verifyController.js';
import { getCertificate } from '../controllers/certController.js';
import {
  getAnalysis,
  updateSenderMap,
  updateCorroboration,
  uploadCounterpartOrReexport,
  getLegalRequestDraft,
} from '../controllers/forensicsController.js';
import Evidence from '../models/Evidence.js';

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

// Phase 4: Forensics Analysis & Sender Map
router.get('/:id/analysis', getAnalysis);
router.post('/:id/sender-map', updateSenderMap);

// Phase 5: Corroboration & Counterpart/Reexport Diff
router.post('/:id/corroboration/:item', updateCorroboration);
router.post('/:id/counterpart', uploadCounterpartOrReexport);
router.post('/:id/reexport', uploadCounterpartOrReexport);
router.get('/:id/legal-request', getLegalRequestDraft);

// Phase 7: RFC 3161 TSR Token
router.get('/:id/tsr', async (req, res, next) => {
  try {
    const evidence = await Evidence.findById(req.params.id);
    if (!evidence) return res.status(404).json({ error: 'Evidence not found' });
    res.json({
      sha256: evidence.sha256,
      tsaToken: evidence.tsaToken,
      tsaTime: evidence.tsaTime,
      tsaStatus: evidence.tsaStatus || 'pending',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
