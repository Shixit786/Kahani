import fs from 'fs';
import path from 'path';
import Case from '../models/Case.js';
import Evidence from '../models/Evidence.js';
import { sha256Buffer, appendCustodyEvent, nowIST } from '../lib/integrity.js';
import { parseWhatsAppChat } from '../lib/whatsappParser.js';

export async function handleCapture(req, res, next) {
  try {
    const {
      caseId,
      chatName,
      messages,
      txtContent,
      clientSha256,
      screenshotBase64,
      capturedBy,
    } = req.body;

    if (!caseId) return res.status(400).json({ error: 'caseId is required' });
    if (!txtContent) return res.status(400).json({ error: 'txtContent is required' });

    const parentCase = await Case.findById(caseId);
    if (!parentCase) return res.status(404).json({ error: 'Case not found' });

    // 1. Verify SHA-256 integrity
    const textBuffer = Buffer.from(txtContent, 'utf8');
    const serverSha256 = sha256Buffer(textBuffer);

    if (clientSha256 && clientSha256.toLowerCase() !== serverSha256) {
      return res.status(409).json({
        error: 'Hash mismatch during browser capture',
        clientSha256,
        serverSha256,
      });
    }

    const captureIp =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Kahani Extension';
    const serverIST = nowIST();

    const uploadsDir = path.join(process.cwd(), 'uploads', String(parentCase._id));
    fs.mkdirSync(uploadsDir, { recursive: true });

    const ts = Date.now();
    const safeChatName = (chatName || 'whatsapp_chat').replace(/[^a-zA-Z0-9._-]/g, '_');

    // 2. Save text evidence
    const textFileName = `${ts}-${safeChatName}_capture.txt`;
    const textFilePath = path.join(uploadsDir, textFileName);
    fs.writeFileSync(textFilePath, txtContent, 'utf8');

    const textEvidence = await Evidence.create({
      caseId: parentCase._id,
      filename: `${safeChatName}_live_capture.txt`,
      sizeBytes: textBuffer.length,
      mimeType: 'text/plain',
      sha256: serverSha256,
      clientSha256: serverSha256,
      deviceType: 'Computer',
      makeModel: 'Browser Web WhatsApp',
      serialNo: 'N/A',
      deviceId: 'WhatsApp Web Session',
      notes: `Live web capture of chat "${chatName}". Method: Kahani Extension. Server IST: ${serverIST}`,
      uploadedBy: capturedBy || 'Investigator (Extension)',
      storagePath: textFilePath,
      declarationAccepted: true,
      uploaderIp: captureIp,
      userAgent,
      linkedType: 'original',
    });

    // Append genesis custody event
    await appendCustodyEvent(textEvidence._id, {
      action: 'Captured live via Kahani Extension',
      actor: capturedBy || 'Investigator',
      actorRole: 'Expert',
      details: `Live chat capture sealed: SHA-256: ${serverSha256} | IP: ${captureIp} | Method: Kahani Extension`,
    });

    // Run parser & store line hashes
    const analysis = parseWhatsAppChat(txtContent, textEvidence.createdAt);
    if (analysis.messages.length > 0) {
      textEvidence.lineHashes = analysis.messages.map((m) => ({
        lineIndex: m.lineIndex,
        hash: m.lineHash,
        raw: `${m.date}|${m.time}|${m.sender}|${m.text}`,
      }));
    }
    if (analysis.senders.length > 0) {
      textEvidence.senderMap = analysis.senders.map((s) => ({
        label: s.label,
        phoneNumber: s.phoneNumber || '',
        source: s.source,
        screenshotEvidenceId: null,
      }));
    }
    await textEvidence.save();

    // 3. Save Screenshot PNG if provided
    let screenshotEvidence = null;
    if (screenshotBase64) {
      const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
      const imgBuffer = Buffer.from(base64Data, 'base64');
      const imgSha256 = sha256Buffer(imgBuffer);

      const imgFileName = `${ts}-${safeChatName}_screenshot.png`;
      const imgFilePath = path.join(uploadsDir, imgFileName);
      fs.writeFileSync(imgFilePath, imgBuffer);

      screenshotEvidence = await Evidence.create({
        caseId: parentCase._id,
        filename: `${safeChatName}_screen_context.png`,
        sizeBytes: imgBuffer.length,
        mimeType: 'image/png',
        sha256: imgSha256,
        clientSha256: imgSha256,
        deviceType: 'Computer',
        makeModel: 'Visible Tab Capture',
        serialNo: 'N/A',
        deviceId: 'WhatsApp Web',
        notes: `Contextual tab screenshot of chat "${chatName}" captured synchronously with text export.`,
        uploadedBy: capturedBy || 'Investigator (Extension)',
        storagePath: imgFilePath,
        declarationAccepted: true,
        uploaderIp: captureIp,
        userAgent,
        linkedType: 'screenshot',
        parentEvidenceId: textEvidence._id,
      });

      await appendCustodyEvent(screenshotEvidence._id, {
        action: 'Contextual screenshot captured via Kahani Extension',
        actor: capturedBy || 'Investigator',
        actorRole: 'Expert',
        details: `Synchronous screen context: SHA-256: ${imgSha256} | Linked to text record ${textEvidence._id}`,
      });
    }

    res.status(201).json({
      ok: true,
      textEvidenceId: textEvidence._id,
      screenshotEvidenceId: screenshotEvidence?._id || null,
      sha256: serverSha256,
      lockedAtIST: serverIST,
    });
  } catch (err) {
    next(err);
  }
}
