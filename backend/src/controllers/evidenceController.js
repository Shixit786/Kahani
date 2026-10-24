import fs from 'fs';
import path from 'path';
import multer from 'multer';
import Case from '../models/Case.js';
import Evidence from '../models/Evidence.js';
import CustodyEvent from '../models/CustodyEvent.js';
import { sha256File, appendCustodyEvent, nowIST } from '../lib/integrity.js';

// ---------------------------------------------------------------------------
// Multer — disk storage with dynamic destination
// ---------------------------------------------------------------------------

// We need caseId from the URL param before multer runs, so we configure
// the destination lazily inside diskStorage.
const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const caseId = req.params.id; // set on the route as /cases/:id/evidence
    const dir = path.join(process.cwd(), 'uploads', caseId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ts = Date.now();
    // Sanitise original filename (replace spaces and special chars)
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}-${safe}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
}).single('file');

// ---------------------------------------------------------------------------
// POST /api/cases/:id/evidence
// ---------------------------------------------------------------------------
export async function uploadEvidence(req, res, next) {
  // Run multer first
  uploadMiddleware(req, res, async (multerErr) => {
    if (multerErr) {
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large (max 50 MB)' });
      }
      return next(multerErr);
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded (field name must be "file")' });
    }

    const storagePath = req.file.path;

    try {
      // 1. Validate the parent case exists
      const parentCase = await Case.findById(req.params.id).lean();
      if (!parentCase) {
        fs.unlinkSync(storagePath);
        return res.status(404).json({ error: 'Case not found' });
      }

      // 2. Validate required fields
      const {
        clientSha256,
        deviceType,
        makeModel,
        serialNo,
        deviceId,
        uploadedBy,
        notes,
        declarationAccepted,
      } = req.body;

      // Enforce BNS declaration
      const isDeclared = declarationAccepted === 'true' || declarationAccepted === true;
      if (!isDeclared) {
        fs.unlinkSync(storagePath);
        return res.status(400).json({
          error:
            'Declaration required: You must declare that this evidence is genuine under Bharatiya Sakshya Adhiniyam / BNS.',
        });
      }

      if (!uploadedBy?.trim()) {
        fs.unlinkSync(storagePath);
        return res.status(400).json({ error: 'uploadedBy is required' });
      }

      const validDeviceTypes = ['Computer', 'Mobile', 'Flash Drive', 'Cloud', 'Other'];
      if (!deviceType || !validDeviceTypes.includes(deviceType)) {
        fs.unlinkSync(storagePath);
        return res.status(400).json({
          error: `deviceType must be one of: ${validDeviceTypes.join(', ')}`,
        });
      }

      // Capture uploader IP and user agent
      const uploaderIp =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Unknown Client';

      // 3. Compute server-side SHA-256 (streaming)
      const serverSha256 = await sha256File(storagePath);

      // 4. Hash mismatch guard
      if (clientSha256 && clientSha256.toLowerCase() !== serverSha256) {
        fs.unlinkSync(storagePath); // delete the corrupted/mismatched file
        return res.status(409).json({
          error: 'Hash mismatch during upload',
          clientSha256: clientSha256.toLowerCase(),
          serverSha256,
        });
      }

      // 5. Persist the Evidence document
      const evidence = await Evidence.create({
        caseId: parentCase._id,
        filename: req.file.originalname,
        sizeBytes: req.file.size,
        mimeType: req.file.mimetype,
        sha256: serverSha256,
        clientSha256: clientSha256 ? clientSha256.toLowerCase() : null,
        deviceType,
        makeModel: makeModel ?? '',
        serialNo: serialNo ?? '',
        deviceId: deviceId ?? '',
        notes: notes ?? '',
        uploadedBy,
        storagePath,
        declarationAccepted: true,
        uploaderIp,
        userAgent,
      });

      // 6. Append genesis custody event (append-only, single authorised path)
      const custodyDetails = `SHA-256: ${serverSha256} | Declaration: Genuine evidence under BNS accepted | IP: ${uploaderIp} | Client: ${userAgent.slice(0, 80)}`;
      const custodyEvent = await appendCustodyEvent(evidence._id, {
        action: 'Evidence received & hash locked',
        actor: uploadedBy,
        actorRole: 'Party',
        details: custodyDetails,
      });

      res.status(201).json({
        evidence,
        lockedAtIST: custodyEvent.timestampIST,
      });
    } catch (err) {
      // Clean up uploaded file on any unexpected error
      if (fs.existsSync(storagePath)) fs.unlinkSync(storagePath);
      next(err);
    }
  });
}

// ---------------------------------------------------------------------------
// GET /api/evidence/:id
// ---------------------------------------------------------------------------
export async function getEvidence(req, res, next) {
  try {
    const evidence = await Evidence.findById(req.params.id).lean();
    if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

    const custodyChain = await CustodyEvent.find({ evidenceId: evidence._id })
      .sort({ seqNo: 1 })
      .lean();

    res.json({ evidence, custodyChain });
  } catch (err) {
    next(err);
  }
}
