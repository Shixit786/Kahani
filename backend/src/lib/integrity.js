import crypto from 'crypto';
import fs from 'fs';
import CustodyEvent from '../models/CustodyEvent.js';

// ---------------------------------------------------------------------------
// Hashing helpers
// ---------------------------------------------------------------------------

/**
 * Stream-based SHA-256 of a file on disk.
 * @param {string} filePath  Absolute path to the file.
 * @returns {Promise<string>} Lowercase hex digest.
 */
export function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * SHA-256 of an in-memory Buffer or string.
 * @param {Buffer|string} buf
 * @returns {string} Lowercase hex digest.
 */
export function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// ---------------------------------------------------------------------------
// IST timestamp
// ---------------------------------------------------------------------------

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

/**
 * Returns the current time as a human-readable IST string.
 * Format: "DD/MM/YYYY HH:mm:ss IST"
 */
export function nowIST() {
  const now = new Date(Date.now() + IST_OFFSET_MS);
  const pad = (n) => String(n).padStart(2, '0');

  const dd = pad(now.getUTCDate());
  const mm = pad(now.getUTCMonth() + 1);
  const yyyy = now.getUTCFullYear();
  const HH = pad(now.getUTCHours());
  const min = pad(now.getUTCMinutes());
  const ss = pad(now.getUTCSeconds());

  return `${dd}/${mm}/${yyyy} ${HH}:${min}:${ss} IST`;
}

// ---------------------------------------------------------------------------
// Chain-of-custody hashing
// ---------------------------------------------------------------------------

/**
 * Compute the canonical entry hash for a custody event.
 *
 * IMPORTANT: The input object MUST be a plain JS object with EXACTLY these
 * keys in EXACTLY this order. Never pass a raw Mongoose document — always
 * extract the plain values first (as done in appendCustodyEvent below).
 *
 * @param {{
 *   evidenceId: string,
 *   seqNo: number,
 *   action: string,
 *   actor: string,
 *   actorRole: string,
 *   details: string,
 *   timestampIST: string,
 *   prevHash: string
 * }} e
 * @returns {string} Lowercase hex SHA-256 digest.
 */
export function computeEntryHash(e) {
  // Build with fixed key order — any deviation breaks the chain
  const canonical = {
    evidenceId: String(e.evidenceId),
    seqNo: Number(e.seqNo),
    action: String(e.action),
    actor: String(e.actor),
    actorRole: String(e.actorRole),
    details: String(e.details),
    timestampIST: String(e.timestampIST),
    prevHash: String(e.prevHash),
  };
  return sha256Buffer(JSON.stringify(canonical));
}

// Genesis prevHash: 64 zero characters (256 zero bits)
const GENESIS_HASH = '0'.repeat(64);

// ---------------------------------------------------------------------------
// Append-only event writer  (the ONLY authorised write path for CustodyEvent)
// ---------------------------------------------------------------------------

/**
 * Appends a new custody event to the chain for a given evidence item.
 *
 * This is the single authorised path for writing CustodyEvent documents.
 * No update or delete operations are performed here or anywhere else.
 *
 * @param {string|import('mongoose').Types.ObjectId} evidenceId
 * @param {{
 *   action: string,
 *   actor: string,
 *   actorRole: string,
 *   details?: string,
 * }} data
 * @returns {Promise<import('../models/CustodyEvent.js').default>} The saved event.
 */
export async function appendCustodyEvent(evidenceId, data) {
  // Find the most recent event to continue the chain
  const last = await CustodyEvent.findOne({ evidenceId })
    .sort({ seqNo: -1 })
    .lean();

  const seqNo = last ? last.seqNo + 1 : 1;
  const prevHash = last ? last.entryHash : GENESIS_HASH;
  const timestampIST = nowIST();

  // Build the canonical payload (plain object, fixed key order)
  const payload = {
    evidenceId: String(evidenceId),
    seqNo,
    action: String(data.action),
    actor: String(data.actor),
    actorRole: String(data.actorRole),
    details: String(data.details ?? ''),
    timestampIST,
    prevHash,
  };

  const entryHash = computeEntryHash(payload);

  const event = await CustodyEvent.create({
    evidenceId,
    seqNo,
    action: payload.action,
    actor: payload.actor,
    actorRole: payload.actorRole,
    details: payload.details,
    timestampIST,
    prevHash,
    entryHash,
  });

  return event;
}

// ---------------------------------------------------------------------------
// Chain verifier
// ---------------------------------------------------------------------------

/**
 * Walks the full custody chain for an evidence item in seqNo order and
 * verifies:
 *   1. prevHash of each event matches the entryHash of the preceding event.
 *   2. The stored entryHash matches a freshly recomputed hash of the payload.
 *
 * @param {string|import('mongoose').Types.ObjectId} evidenceId
 * @returns {Promise<{ok: boolean, brokenAt: number|null, reason: string|null}>}
 */
export async function verifyChain(evidenceId) {
  const events = await CustodyEvent.find({ evidenceId })
    .sort({ seqNo: 1 })
    .lean();

  if (events.length === 0) {
    return { ok: true, brokenAt: null, reason: null };
  }

  let expectedPrevHash = GENESIS_HASH;

  for (const ev of events) {
    // Check 1: prevHash linkage
    if (ev.prevHash !== expectedPrevHash) {
      return {
        ok: false,
        brokenAt: ev.seqNo,
        reason: `prevHash mismatch at seqNo ${ev.seqNo}: expected "${expectedPrevHash}", got "${ev.prevHash}"`,
      };
    }

    // Check 2: recompute and compare entryHash
    const recomputed = computeEntryHash({
      evidenceId: String(evidenceId),
      seqNo: ev.seqNo,
      action: ev.action,
      actor: ev.actor,
      actorRole: ev.actorRole,
      details: ev.details,
      timestampIST: ev.timestampIST,
      prevHash: ev.prevHash,
    });

    if (recomputed !== ev.entryHash) {
      return {
        ok: false,
        brokenAt: ev.seqNo,
        reason: `entryHash mismatch at seqNo ${ev.seqNo}: stored hash does not match recomputed value (record may have been tampered)`,
      };
    }

    expectedPrevHash = ev.entryHash;
  }

  return { ok: true, brokenAt: null, reason: null };
}
