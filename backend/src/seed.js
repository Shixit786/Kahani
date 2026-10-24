/**
 * npm run seed
 * Creates a realistic demo case with evidence and custody events.
 * Safe to re-run: deletes any previous seed data for this case title first.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import Case from './models/Case.js';
import Evidence from './models/Evidence.js';
import CustodyEvent from './models/CustodyEvent.js';
import { sha256Buffer, appendCustodyEvent } from './lib/integrity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// WhatsApp chat content — 6 realistic Hinglish threatening messages
// ---------------------------------------------------------------------------
const CHAT_CONTENT = `WhatsApp Chat Export — Meena Kumari
Exported on: 24/10/2026 09:50:00 IST
------------------------------------------------------------
[24/10/2026, 09:14:22] Suresh Malhotra: Dekh Meena, teri aukat nahi hai mujhse panga lene ki. Samjhi?
[24/10/2026, 09:15:47] Suresh Malhotra: Khabardar agar tune aage police ya court jaisi galti ki toh anjaam bura hoga.
[24/10/2026, 09:16:03] Suresh Malhotra: Tujhe aur tere poore ghar waalon ko dekhh lunga main. Ye mera waada hai.
[24/10/2026, 09:18:31] Suresh Malhotra: Ek aur chance de raha hoon. Last warning hai ye teri — aage mat badh.
[24/10/2026, 09:19:55] Suresh Malhotra: Kal shaam tak paisa wapas karo varna kya consequences honge ye tu jaanti hai.
[24/10/2026, 09:45:12] Suresh Malhotra: Soch le achhe se. Main kya kar sakta hoon, tera pura mohalla jaanta hai.
------------------------------------------------------------
End of Export
`;

const SEED_CASE_TITLE = 'Meena — WhatsApp Threat Case';

async function seed() {
  console.log('[SEED] Connecting to MongoDB…');
  await connectDB();
  console.log('[SEED] Connected ✓');

  // ── Idempotency: remove previous seed ────────────────────────────────────
  const oldCase = await Case.findOne({ title: SEED_CASE_TITLE }).lean();
  if (oldCase) {
    const oldEvidences = await Evidence.find({ caseId: oldCase._id }).lean();
    for (const ev of oldEvidences) {
      await CustodyEvent.deleteMany({ evidenceId: ev._id });
    }
    await Evidence.deleteMany({ caseId: oldCase._id });
    await Case.deleteOne({ _id: oldCase._id });
    console.log('[SEED] Removed previous seed data.');
  }

  // ── Create case ───────────────────────────────────────────────────────────
  const caseDoc = await Case.create({
    title: SEED_CASE_TITLE,
    description:
      'Criminal complaint by Meena Kumari regarding threatening WhatsApp messages received from Suresh Malhotra on 24-Oct-2026. Section 506 IPC / BNS.',
    partyName: 'Meena Kumari',
    partyAddress: 'Flat 3C, Sundar Nagar Apartments, Sector 14, New Delhi — 110003',
  });
  console.log(`[SEED] Case created: ${caseDoc._id}`);

  // ── Write evidence file ───────────────────────────────────────────────────
  const uploadsDir = path.join(__dirname, '..', 'uploads', String(caseDoc._id));
  fs.mkdirSync(uploadsDir, { recursive: true });

  const timestamp = Date.now();
  const filename = 'whatsapp_chat_export.txt';
  const storedFilename = `${timestamp}-${filename}`;
  const filePath = path.join(uploadsDir, storedFilename);

  fs.writeFileSync(filePath, CHAT_CONTENT, 'utf8');
  console.log(`[SEED] Evidence file written: ${filePath}`);

  // ── Compute hash ──────────────────────────────────────────────────────────
  const fileBuffer = Buffer.from(CHAT_CONTENT, 'utf8');
  const sha256 = sha256Buffer(fileBuffer);
  console.log(`[SEED] SHA-256: ${sha256}`);

  // ── Create evidence record ────────────────────────────────────────────────
  const evidenceDoc = await Evidence.create({
    caseId: caseDoc._id,
    filename,
    sizeBytes: fileBuffer.length,
    mimeType: 'text/plain',
    sha256,
    clientSha256: sha256,          // client confirmed the same hash
    deviceType: 'Mobile',
    makeModel: 'Samsung Galaxy A52',
    serialNo: 'R5CX501ABCD',
    deviceId: '355123456789012',   // IMEI
    notes:
      'WhatsApp chat backup exported via "Export Chat" → saved as .txt. ' +
      'Phone belongs to complainant Meena Kumari.',
    uploadedBy: 'Meena Kumari',
    storagePath: filePath,
  });
  console.log(`[SEED] Evidence created: ${evidenceDoc._id}`);

  // ── Append custody events ─────────────────────────────────────────────────

  // 1. Genesis — received & hash locked (Party)
  await appendCustodyEvent(evidenceDoc._id, {
    action: 'Evidence received & hash locked',
    actor: 'Meena Kumari',
    actorRole: 'Party',
    details:
      `Complainant submitted WhatsApp chat export from Samsung Galaxy A52 ` +
      `(IMEI: 355123456789012). SHA-256 computed and locked: ${sha256}.`,
  });
  console.log('[SEED] Custody event 1 appended.');

  // 2. Reviewed by counsel (Lawyer)
  await appendCustodyEvent(evidenceDoc._id, {
    action: 'Evidence reviewed by counsel',
    actor: 'Adv. Ravi Sharma',
    actorRole: 'Lawyer',
    details:
      'Counsel Adv. Ravi Sharma (Bar No. DL/2018/4521) reviewed the chat export ' +
      'at the complainant\'s residence. File integrity confirmed against stored hash.',
  });
  console.log('[SEED] Custody event 2 appended.');

  // 3. Forensic copy created (Expert)
  await appendCustodyEvent(evidenceDoc._id, {
    action: 'Forensic copy created and verified',
    actor: 'Arjun Mehta — Delhi Cyber Forensics Lab',
    actorRole: 'Expert',
    details:
      'Forensic copy created using Cellebrite UFED 4PC v7.58. ' +
      'SHA-256 of copy matches original. Write-blocked device image archived.',
  });
  console.log('[SEED] Custody event 3 appended.');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n[SEED] ✓ Done!');
  console.log('─'.repeat(60));
  console.log(`  Case ID     : ${caseDoc._id}`);
  console.log(`  Evidence ID : ${evidenceDoc._id}`);
  console.log(`  SHA-256     : ${sha256}`);
  console.log(`  File        : ${filePath}`);
  console.log('─'.repeat(60));
  console.log('  Test commands:');
  console.log(`  curl http://localhost:5050/api/cases/${caseDoc._id}`);
  console.log(`  curl http://localhost:5050/api/evidence/${evidenceDoc._id}`);
  console.log(`  curl http://localhost:5050/api/evidence/${evidenceDoc._id}/verify-chain`);
  console.log('─'.repeat(60));

  process.exit(0);
}

seed().catch((err) => {
  console.error('[SEED] Fatal error:', err);
  process.exit(1);
});
