import fs from 'fs';
import path from 'path';
import multer from 'multer';
import Evidence from '../models/Evidence.js';
import Case from '../models/Case.js';
import { parseWhatsAppChat } from '../lib/whatsappParser.js';
import { computeChatDiff } from '../lib/chatDiff.js';
import { appendCustodyEvent, sha256Buffer, sha256File, nowIST } from '../lib/integrity.js';

// Multer storage for linked counterpart / re-export uploads
const linkedStorage = multer.diskStorage({
  destination(req, _file, cb) {
    const parentId = req.params.id;
    const dir = path.join(process.cwd(), 'uploads', 'linked', parentId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}-${safe}`);
  },
});

export const linkedUploadMiddleware = multer({
  storage: linkedStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('file');

/**
 * Recomputes Trust Level strictly based on independent corroboration
 * - LOW: file alone (regardless of format quality)
 * - MEDIUM: counterpartMatch OR freshReexport OR telecomKyc is done
 * - HIGH: >= 2 independent items done AND expertCertificate is done
 */
function calculateTrustLevel(corroborationMap) {
  if (!corroborationMap) return 'LOW';

  const getStatus = (key) => {
    if (corroborationMap instanceof Map) {
      return corroborationMap.get(key)?.status;
    }
    return corroborationMap[key]?.status;
  };

  const counterpartDone = getStatus('counterpartMatch') === 'done';
  const reexportDone = getStatus('freshReexport') === 'done';
  const telecomKycDone = getStatus('telecomKyc') === 'done';
  const cdrDone = getStatus('cdrLocation') === 'done';
  const deviceDone = getStatus('deviceForensics') === 'done';
  const senderNumberDone = getStatus('senderNumberRecorded') === 'done';
  const expertCertDone = getStatus('expertCertificate') === 'done';

  const independentDoneCount = [
    counterpartDone,
    reexportDone,
    telecomKycDone,
    cdrDone,
    deviceDone,
    senderNumberDone,
  ].filter(Boolean).length;

  if (independentDoneCount >= 2 && expertCertDone) {
    return 'HIGH';
  }

  if (counterpartDone || reexportDone || telecomKycDone || cdrDone || deviceDone) {
    return 'MEDIUM';
  }

  return 'LOW';
}

// ---------------------------------------------------------------------------
// GET /api/evidence/:id/analysis
// ---------------------------------------------------------------------------
export async function getAnalysis(req, res, next) {
  try {
    const evidence = await Evidence.findById(req.params.id);
    if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

    let rawText = '';
    if (fs.existsSync(evidence.storagePath)) {
      rawText = fs.readFileSync(evidence.storagePath, 'utf8');
    }

    const analysis = parseWhatsAppChat(rawText, evidence.createdAt);

    // Save lineHashes and discovered senders if not already populated
    if ((!evidence.lineHashes || evidence.lineHashes.length === 0) && analysis.messages.length > 0) {
      evidence.lineHashes = analysis.messages.map((m) => ({
        lineIndex: m.lineIndex,
        hash: m.lineHash,
        raw: `${m.date}|${m.time}|${m.sender}|${m.text}`,
      }));
    }

    if ((!evidence.senderMap || evidence.senderMap.length === 0) && analysis.senders.length > 0) {
      evidence.senderMap = analysis.senders.map((s) => ({
        label: s.label,
        phoneNumber: s.phoneNumber || '',
        source: s.source,
        screenshotEvidenceId: null,
      }));
      await evidence.save();
    }

    // Merge custom mapped phone numbers into analysis.senders
    if (evidence.senderMap && evidence.senderMap.length > 0) {
      const customMap = new Map(evidence.senderMap.map((s) => [s.label, s.phoneNumber]));
      analysis.senders = analysis.senders.map((s) => ({
        ...s,
        phoneNumber: customMap.get(s.label) || s.phoneNumber,
      }));
    }

    const trustLevel = calculateTrustLevel(evidence.corroboration);
    if (evidence.trustLevel !== trustLevel) {
      evidence.trustLevel = trustLevel;
      await evidence.save();
    }

    res.json({
      ...analysis,
      trustLevel,
      corroboration: evidence.corroboration,
      senderMap: evidence.senderMap,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/evidence/:id/sender-map
// ---------------------------------------------------------------------------
export async function updateSenderMap(req, res, next) {
  try {
    const { label, phoneNumber, source, screenshotEvidenceId, actor } = req.body;
    if (!label) return res.status(400).json({ error: 'Sender label is required' });

    const evidence = await Evidence.findById(req.params.id);
    if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

    const existingIdx = evidence.senderMap.findIndex((s) => s.label === label);
    if (existingIdx !== -1) {
      evidence.senderMap[existingIdx].phoneNumber = phoneNumber ?? evidence.senderMap[existingIdx].phoneNumber;
      evidence.senderMap[existingIdx].source = source ?? 'user-entered';
      if (screenshotEvidenceId) evidence.senderMap[existingIdx].screenshotEvidenceId = screenshotEvidenceId;
    } else {
      evidence.senderMap.push({
        label,
        phoneNumber: phoneNumber || '',
        source: source || 'user-entered',
        screenshotEvidenceId: screenshotEvidenceId || null,
      });
    }

    // Append custody event
    await appendCustodyEvent(evidence._id, {
      action: 'Sender identity corroborated',
      actor: actor || 'Forensic Expert',
      actorRole: 'Expert',
      details: `Sender label "${label}" associated with phone number: ${phoneNumber || 'Pending'}`,
    });

    await evidence.save();
    res.json({ success: true, senderMap: evidence.senderMap });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/evidence/:id/corroboration/:item
// ---------------------------------------------------------------------------
export async function updateCorroboration(req, res, next) {
  try {
    const { item } = req.params;
    const { status, by, note } = req.body;

    const validItems = [
      'senderNumberRecorded',
      'counterpartMatch',
      'freshReexport',
      'telecomKyc',
      'cdrLocation',
      'deviceForensics',
      'expertCertificate',
    ];

    if (!validItems.includes(item)) {
      return res.status(400).json({ error: `Invalid item. Must be one of: ${validItems.join(', ')}` });
    }

    const evidence = await Evidence.findById(req.params.id);
    if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

    const currentItem = evidence.corroboration.get(item) || {};
    const updated = {
      status: status || currentItem.status || 'pending',
      by: by || currentItem.by || 'Auditor',
      at: nowIST(),
      note: note || currentItem.note || '',
    };

    evidence.corroboration.set(item, updated);
    evidence.trustLevel = calculateTrustLevel(evidence.corroboration);

    // Append custody event
    await appendCustodyEvent(evidence._id, {
      action: `Corroboration step: ${item}`,
      actor: by || 'Forensic Expert',
      actorRole: 'Expert',
      details: `Status marked "${updated.status}" | Note: ${updated.note}`,
    });

    await evidence.save();
    res.json({ success: true, corroboration: evidence.corroboration, trustLevel: evidence.trustLevel });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/evidence/:id/counterpart or reexport
// ---------------------------------------------------------------------------
export async function uploadCounterpartOrReexport(req, res, next) {
  linkedUploadMiddleware(req, res, async (err) => {
    if (err) return next(err);
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const parentEvidence = await Evidence.findById(req.params.id);
      if (!parentEvidence) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Parent evidence not found' });
      }

      const isCounterpart = req.path.includes('counterpart');
      const linkedType = isCounterpart ? 'counterpart' : 'reexport';
      const uploadedBy = req.body.uploadedBy || (isCounterpart ? 'Counterpart Party' : 'Forensic Custodian');
      const witness = req.body.witness || '';

      const serverSha256 = await sha256File(req.file.path);

      // Create linked Evidence
      const linkedEvidence = await Evidence.create({
        caseId: parentEvidence.caseId,
        filename: req.file.originalname,
        sizeBytes: req.file.size,
        mimeType: req.file.mimetype,
        sha256: serverSha256,
        clientSha256: req.body.clientSha256 || serverSha256,
        deviceType: parentEvidence.deviceType,
        makeModel: req.body.makeModel || parentEvidence.makeModel,
        serialNo: '',
        deviceId: '',
        notes: `Linked as ${linkedType}. Witness: ${witness}`,
        uploadedBy,
        storagePath: req.file.path,
        declarationAccepted: true,
        linkedType,
        parentEvidenceId: parentEvidence._id,
      });

      // Append custody events on both linked and parent
      await appendCustodyEvent(parentEvidence._id, {
        action: `${linkedType === 'counterpart' ? 'Counterpart' : 'Fresh re-export'} evidence submitted`,
        actor: uploadedBy,
        actorRole: 'Party',
        details: `Linked evidence ID: ${linkedEvidence._id} (SHA-256: ${serverSha256}). Witness: ${witness}`,
      });

      // Mark corroboration item done on parent
      const corroborationKey = isCounterpart ? 'counterpartMatch' : 'freshReexport';
      parentEvidence.corroboration.set(corroborationKey, {
        status: 'done',
        by: uploadedBy,
        at: nowIST(),
        note: `Verified against file ${req.file.originalname}`,
      });
      parentEvidence.trustLevel = calculateTrustLevel(parentEvidence.corroboration);
      await parentEvidence.save();

      // Parse both and compute diff
      const origContent = fs.readFileSync(parentEvidence.storagePath, 'utf8');
      const cpContent = fs.readFileSync(req.file.path, 'utf8');

      const origAnalysis = parseWhatsAppChat(origContent, parentEvidence.createdAt);
      const cpAnalysis = parseWhatsAppChat(cpContent, linkedEvidence.createdAt);

      const diff = computeChatDiff(origAnalysis.messages, cpAnalysis.messages);

      res.status(201).json({
        evidence: linkedEvidence,
        diff,
        trustLevel: parentEvidence.trustLevel,
      });
    } catch (e) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      next(e);
    }
  });
}

// ---------------------------------------------------------------------------
// GET /api/evidence/:id/legal-request?type=kyc|cdr
// ---------------------------------------------------------------------------
export async function getLegalRequestDraft(req, res, next) {
  try {
    const { type } = req.query;
    const evidence = await Evidence.findById(req.params.id);
    if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

    const parentCase = await Case.findById(evidence.caseId);
    const caseTitle = parentCase ? parentCase.title : 'Criminal Investigation';

    // Extract sender phone numbers
    const numbers = (evidence.senderMap || [])
      .map((s) => s.phoneNumber)
      .filter(Boolean);

    const formattedNumbers = numbers.length > 0 ? numbers.join(', ') : '[PHONE NUMBERS PENDING IDENTIFICATION]';

    let draftText = '';

    if (type === 'cdr') {
      draftText = `FORMAL NOTICE UNDER SECTION 94 BNSS / SECTION 91 CrPC
TO: NODAL OFFICER (LEGAL & REGULATORY AFFAIRS)
[TELECOM SERVICE PROVIDER — JIO / AIRTEL / VI]

SUBJECT: Request for Call Detail Records (CDR) & Tower Location Logs
REFERENCE: In the matter of: "${caseTitle}"
EVIDENCE SEAL: SHA-256 [${evidence.sha256}]
DATE OF NOTICE: ${nowIST()}

Sir/Madam,

For the purpose of criminal investigation and electronic evidence corroboration under Section 63 of Bharatiya Sakshya Adhiniyam, 2023, you are hereby requested to furnish certified Call Detail Records (CDR) along with Cell ID / Tower Location Logs and IPDR for the following subscriber number(s):

Target Mobile Number(s): ${formattedNumbers}
Requested Time Window: 24 Hours prior and post incident timestamp
Custodian / Complainant: ${parentCase?.partyName || 'Complainant'}

Please certify the furnished electronic logs under Section 63(4) BSA 2023 along with the requisite system hash and nodal signature.

NOTE: Draft generated for official review — to be issued only by the competent authority under due legal process.
`;
    } else {
      draftText = `FORMAL REQUISITION FOR SUBSCRIBER IDENTITY (CAF / KYC)
UNDER SECTION 94 BNSS / INDIAN TELEGRAPH ACT
TO: NODAL OFFICER (CUSTOMER ACQUISITION & COMPLIANCE)
[TELECOM SERVICE PROVIDER — JIO / AIRTEL / VI]

SUBJECT: Requisition of Customer Acquisition Form (CAF) & Verified KYC Documents
REFERENCE: Case Matter: "${caseTitle}"
PRIMARY EVIDENCE CHECKSUM: ${evidence.sha256}
DATE OF REQUEST: ${nowIST()}

Sir/Madam,

In connection with an ongoing forensic inquiry into electronic messages submitted in "${caseTitle}", you are directed to provide certified true copies of the Customer Application Form (CAF), government photo ID, address proof, and activation timestamp for:

Mobile MSISDN(s): ${formattedNumbers}

The records are required for legal corroboration of electronic evidence pursuant to Bharatiya Sakshya Adhiniyam (BSA), 2023.

NOTE: Draft generated for official review — to be issued only by the competent authority under due legal process.
`;
    }

    res.type('text/plain').send(draftText);
  } catch (err) {
    next(err);
  }
}
