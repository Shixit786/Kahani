/**
 * npm run seed
 * Idempotently seeds the Meena case with:
 * 1. Realistic Android WhatsApp export (encryption header, Hinglish threats from 'Rahul',
 *    multi-line message, media omitted, deleted message, edited message, security code change).
 * 2. Counterpart export from Rahul's device with 1 missing threat line and 1 reworded line,
 *    linked as counterpart so the diff demo works immediately!
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import Case from './models/Case.js';
import Evidence from './models/Evidence.js';
import CustodyEvent from './models/CustodyEvent.js';
import { sha256Buffer, appendCustodyEvent, nowIST } from './lib/integrity.js';
import { parseWhatsAppChat } from './lib/whatsappParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SEED_CASE_TITLE = 'Meena — WhatsApp Threat Case';

// Realistic Master Android Export (Seized from Meena Kumari's device)
const MEENA_EXPORT_TEXT = `24/10/2026, 09:10 am - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
24/10/2026, 09:12 am - Rahul: Dekh Meena, aakhri baar samjha raha hoon tujhe.
24/10/2026, 09:14 am - Rahul: Agar tune police complaint wapas nahi li toh anjaam bohot bura hoga.
24/10/2026, 09:15 am - Meena Kumari: Rahul please mujhe aur mere parivar ko pareshan mat karo. Maine sab sach bola hai.
24/10/2026, 09:16 am - Rahul: Sach? Teri aukaat nahi hai court me khade hone ki.
Tujhe pehle bhi warning di thi.
Ab seedha tere ghar aake faisla hoga.
24/10/2026, 09:18 am - Rahul: Kal subah tak case cancel karwa dena varna dekhna kya karta hoon.
24/10/2026, 09:20 am - Rahul: <Media omitted>
24/10/2026, 09:22 am - Rahul: This message was deleted
24/10/2026, 09:25 am - Rahul: Shaam 5 baje tak sab theek kar dena <This message was edited>
24/10/2026, 09:28 am - Rahul: Yaad rakhna mera naam Rahul Sharma hai, poora shehar jaanta hai mujhe.
24/10/2026, 09:30 am - Rahul's security code changed. Tap to learn more.
24/10/2026, 09:35 am - Meena Kumari: Main darrne waali nahi hoon. Main court me sab submit karungi.
`;

// Counterpart Export (Seized from Rahul's device)
// Diff: Missing the line "Sach? Teri aukaat nahi hai...", and the 09:18 am threat is worded innocently
const RAHUL_COUNTERPART_TEXT = `24/10/2026, 09:10 am - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
24/10/2026, 09:12 am - Rahul: Dekh Meena, aakhri baar samjha raha hoon tujhe.
24/10/2026, 09:14 am - Rahul: Agar tune police complaint wapas nahi li toh anjaam bohot bura hoga.
24/10/2026, 09:15 am - Meena Kumari: Rahul please mujhe aur mere parivar ko pareshan mat karo. Maine sab sach bola hai.
24/10/2026, 09:18 am - Rahul: Kal subah aapas me milkar sab clear kar lenge aage badho.
24/10/2026, 09:20 am - Rahul: <Media omitted>
24/10/2026, 09:25 am - Rahul: Shaam 5 baje tak sab theek kar dena <This message was edited>
24/10/2026, 09:28 am - Rahul: Yaad rakhna mera naam Rahul Sharma hai, poora shehar jaanta hai mujhe.
24/10/2026, 09:30 am - Rahul's security code changed. Tap to learn more.
24/10/2026, 09:35 am - Meena Kumari: Main darrne waali nahi hoon. Main court me sab submit karungi.
`;

async function seed() {
  console.log('[SEED] Connecting to MongoDB…');
  await connectDB();
  console.log('[SEED] Connected ✓');

  // ── 1. Idempotency cleanup ───────────────────────────────────────────────
  const existingCase = await Case.findOne({ title: SEED_CASE_TITLE });
  if (existingCase) {
    const caseUploads = path.join(__dirname, '..', 'uploads', String(existingCase._id));
    if (fs.existsSync(caseUploads)) {
      fs.rmSync(caseUploads, { recursive: true, force: true });
    }
    const linkedUploads = path.join(__dirname, '..', 'uploads', 'linked', String(existingCase._id));
    if (fs.existsSync(linkedUploads)) {
      fs.rmSync(linkedUploads, { recursive: true, force: true });
    }

    const evidences = await Evidence.find({ caseId: existingCase._id }).lean();
    for (const ev of evidences) {
      await CustodyEvent.deleteMany({ evidenceId: ev._id });
    }
    await Evidence.deleteMany({ caseId: existingCase._id });
    await Case.deleteOne({ _id: existingCase._id });
    console.log('[SEED] Removed prior seed case & files.');
  }

  // ── 2. Create Master Case ────────────────────────────────────────────────
  const caseDoc = await Case.create({
    title: SEED_CASE_TITLE,
    description:
      'Criminal complaint by Meena Kumari regarding threatening WhatsApp messages received from Rahul on 24-Oct-2026. Offences under Section 351(2) BNS (Criminal Intimidation).',
    partyName: 'Meena Kumari',
    partyAddress: 'Flat 3C, Sundar Nagar Apartments, Sector 14, New Delhi — 110003',
  });
  console.log(`[SEED] Created Case: ${caseDoc._id}`);

  const uploadsDir = path.join(__dirname, '..', 'uploads', String(caseDoc._id));
  fs.mkdirSync(uploadsDir, { recursive: true });

  // ── 3. Write Master Evidence File ────────────────────────────────────────
  const masterFilename = 'whatsapp_chat_export.txt';
  const masterStored = `${Date.now()}-${masterFilename}`;
  const masterPath = path.join(uploadsDir, masterStored);
  fs.writeFileSync(masterPath, MEENA_EXPORT_TEXT, 'utf8');

  const masterBuffer = Buffer.from(MEENA_EXPORT_TEXT, 'utf8');
  const masterSha256 = sha256Buffer(masterBuffer);

  // Parse chat to generate line hashes & discovered senders
  const masterAnalysis = parseWhatsAppChat(MEENA_EXPORT_TEXT, new Date());

  const masterEvidence = await Evidence.create({
    caseId: caseDoc._id,
    filename: masterFilename,
    sizeBytes: masterBuffer.length,
    mimeType: 'text/plain',
    sha256: masterSha256,
    clientSha256: masterSha256,
    deviceType: 'Mobile',
    makeModel: 'Samsung Galaxy A52',
    serialNo: 'R5CX501ABCD',
    deviceId: '355123456789012', // IMEI
    notes: 'Primary evidence: Seized mobile phone export of complainant Meena Kumari.',
    uploadedBy: 'Meena Kumari',
    storagePath: masterPath,
    declarationAccepted: true,
    uploaderIp: '103.21.124.5',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A525F)',
    senderMap: [
      { label: 'Rahul', phoneNumber: '+91 98765 43210', source: 'user-entered', screenshotEvidenceId: null },
      { label: 'Meena Kumari', phoneNumber: '+91 99112 23344', source: 'user-entered', screenshotEvidenceId: null },
    ],
    lineHashes: masterAnalysis.messages.map((m) => ({
      lineIndex: m.lineIndex,
      hash: m.lineHash,
      raw: `${m.date}|${m.time}|${m.sender}|${m.text}`,
    })),
    corroboration: {
      senderNumberRecorded: { status: 'done', by: 'Insp. R. Verma', at: nowIST(), note: 'Verified against WhatsApp contact info' },
      counterpartMatch: { status: 'done', by: 'Forensic Lab', at: nowIST(), note: 'Counterpart chat compared with diff engine' },
      freshReexport: { status: 'pending', by: '', at: '', note: '' },
      telecomKyc: { status: 'pending', by: '', at: '', note: '' },
      cdrLocation: { status: 'pending', by: '', at: '', note: '' },
      deviceForensics: { status: 'done', by: 'Arjun Mehta — Cyber Lab', at: nowIST(), note: 'Cellebrite UFED 4PC image verified' },
      expertCertificate: { status: 'done', by: 'Dr. P. K. Sen', at: nowIST(), note: 'Signed Section 63 BSA certificate issued' },
    },
    trustLevel: 'HIGH', // 3 independent items + expertCert = HIGH
    linkedType: 'original',
    tsaStatus: 'verified',
    tsaTime: new Date().toISOString(),
  });
  console.log(`[SEED] Created Master Evidence: ${masterEvidence._id}`);

  // ── 4. Append Master Custody Events ──────────────────────────────────────
  await appendCustodyEvent(masterEvidence._id, {
    action: 'Evidence received & hash locked',
    actor: 'Meena Kumari',
    actorRole: 'Party',
    details: `SHA-256: ${masterSha256} | Declaration: Genuine evidence under BNS accepted | IP: 103.21.124.5`,
  });

  await appendCustodyEvent(masterEvidence._id, {
    action: 'Evidence reviewed by counsel',
    actor: 'Adv. Ravi Sharma',
    actorRole: 'Lawyer',
    details: 'Counsel reviewed the chat export (Bar No. DL/2018/4521). Hash integrity verified.',
  });

  await appendCustodyEvent(masterEvidence._id, {
    action: 'Forensic copy created and verified',
    actor: 'Arjun Mehta — Delhi Cyber Forensics Lab',
    actorRole: 'Expert',
    details: 'Physical extraction via Cellebrite UFED. Write-blocked forensic bit-stream image archived.',
  });

  await appendCustodyEvent(masterEvidence._id, {
    action: 'Trusted timestamp obtained from FreeTSA',
    actor: 'FreeTSA RFC 3161 Service',
    actorRole: 'Court',
    details: `Cryptographic RFC 3161 TSR stamped. Hash anchor locked with international time authority.`,
  });

  // ── 5. Write Linked Counterpart Evidence File ────────────────────────────
  const cpFilename = 'rahul_counterpart_export.txt';
  const cpStored = `${Date.now()}-${cpFilename}`;
  const cpPath = path.join(uploadsDir, cpStored);
  fs.writeFileSync(cpPath, RAHUL_COUNTERPART_TEXT, 'utf8');

  const cpBuffer = Buffer.from(RAHUL_COUNTERPART_TEXT, 'utf8');
  const cpSha256 = sha256Buffer(cpBuffer);

  const cpAnalysis = parseWhatsAppChat(RAHUL_COUNTERPART_TEXT, new Date());

  const cpEvidence = await Evidence.create({
    caseId: caseDoc._id,
    filename: cpFilename,
    sizeBytes: cpBuffer.length,
    mimeType: 'text/plain',
    sha256: cpSha256,
    clientSha256: cpSha256,
    deviceType: 'Mobile',
    makeModel: 'OnePlus 11 5G',
    serialNo: 'OP11-884210',
    deviceId: '358992019481721',
    notes: 'Counterpart export obtained from accused Rahul Sharma during formal inquiry.',
    uploadedBy: 'Cyber Crime Investigation Unit',
    storagePath: cpPath,
    declarationAccepted: true,
    linkedType: 'counterpart',
    parentEvidenceId: masterEvidence._id,
    lineHashes: cpAnalysis.messages.map((m) => ({
      lineIndex: m.lineIndex,
      hash: m.lineHash,
      raw: `${m.date}|${m.time}|${m.sender}|${m.text}`,
    })),
    trustLevel: 'MEDIUM',
  });
  console.log(`[SEED] Created Counterpart Evidence: ${cpEvidence._id}`);

  await appendCustodyEvent(cpEvidence._id, {
    action: 'Counterpart evidence seized & hash locked',
    actor: 'Inspector R. Verma',
    actorRole: 'Expert',
    details: `SHA-256: ${cpSha256} | Seized from OnePlus 11 (Accused) | Linked to master ${masterEvidence._id}`,
  });

  console.log('\n[SEED] ✓ Done! All demo data seeded.');
  console.log('─'.repeat(60));
  console.log(`  Case ID     : ${caseDoc._id}`);
  console.log(`  Master Ev.  : ${masterEvidence._id}`);
  console.log(`  Counterpart : ${cpEvidence._id}`);
  console.log(`  Master Hash : ${masterSha256}`);
  console.log('─'.repeat(60));

  process.exit(0);
}

seed().catch((err) => {
  console.error('[SEED] Fatal error:', err);
  process.exit(1);
});
