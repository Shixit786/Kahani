import multer from 'multer';
import Evidence from '../models/Evidence.js';
import CustodyEvent from '../models/CustodyEvent.js';
import { sha256Buffer, appendCustodyEvent, verifyChain as verifyChainUtil } from '../lib/integrity.js';

// Memory storage — we only need the buffer for hashing
const memUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('file');

// ---------------------------------------------------------------------------
// POST /api/evidence/:id/verify-file
// ---------------------------------------------------------------------------
export async function verifyFile(req, res, next) {
  memUpload(req, res, async (multerErr) => {
    if (multerErr) return next(multerErr);
    if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name must be "file")' });

    try {
      const evidence = await Evidence.findById(req.params.id).lean();
      if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

      const currentHash = sha256Buffer(req.file.buffer);
      const match = currentHash === evidence.sha256;
      const actor = req.body.actor?.trim() || 'Verifier';

      // Always append a verification custody event
      await appendCustodyEvent(evidence._id, {
        action: `Integrity verification: ${match ? 'MATCH' : 'MISMATCH'}`,
        actor,
        actorRole: 'Expert',
        details: `Submitted file hash: ${currentHash}. Stored hash: ${evidence.sha256}.`,
      });

      res.json({
        match,
        originalHash: evidence.sha256,
        currentHash,
      });
    } catch (err) {
      next(err);
    }
  });
}

// ---------------------------------------------------------------------------
// GET /api/evidence/:id/verify-chain
// ---------------------------------------------------------------------------
export async function verifyChain(req, res, next) {
  try {
    const evidence = await Evidence.findById(req.params.id).lean();
    if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

    const result = await verifyChainUtil(evidence._id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
