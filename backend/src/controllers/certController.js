import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import QRCode from 'qrcode';
import Evidence from '../models/Evidence.js';
import Case from '../models/Case.js';
import CustodyEvent from '../models/CustodyEvent.js';
import { verifyChain } from '../lib/integrity.js';

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 50;
const CONTENT_W = A4_W - 2 * MARGIN;

// ---------------------------------------------------------------------------
// GET /api/evidence/:id/certificate
// ---------------------------------------------------------------------------
export async function getCertificate(req, res, next) {
  try {
    const evidence = await Evidence.findById(req.params.id).lean();
    if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

    const caseDoc = await Case.findById(evidence.caseId).lean();
    if (!caseDoc) return res.status(404).json({ error: 'Case not found' });

    const events = await CustodyEvent.find({ evidenceId: evidence._id })
      .sort({ seqNo: 1 })
      .lean();

    const chainResult = await verifyChain(evidence._id);

    // ── QR code ──────────────────────────────────────────────────────────────
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const qrUrl = `${frontendUrl}/evidence/${evidence._id}`;

    // toDataURL is more reliable in ESM than toBuffer
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 110, margin: 1 });
    const qrBuf = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    // ── PDF skeleton ─────────────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`Kahani Certificate — ${evidence._id}`);
    pdfDoc.setAuthor('Kahani Evidence Integrity Tracker');

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const qrImage = await pdfDoc.embedPng(qrBuf);

    const BLACK = rgb(0, 0, 0);
    const GREY = rgb(0.45, 0.45, 0.45);
    const LIGHT_GREY = rgb(0.87, 0.87, 0.87);
    const WHITE = rgb(1, 1, 1);
    const GREEN = rgb(0, 0.45, 0.1);
    const RED = rgb(0.75, 0, 0);

    // ── Shared drawing helpers ────────────────────────────────────────────────
    let page = pdfDoc.addPage([A4_W, A4_H]);
    let y = A4_H - MARGIN;

    const drawWatermark = (pg) => {
      pg.drawText('DRAFT', {
        x: 110,
        y: 260,
        size: 95,
        font: boldFont,
        color: rgb(0.90, 0.90, 0.90),
        rotate: degrees(45),
        opacity: 0.55,
      });
      pg.drawText('to be reviewed and signed by party / expert', {
        x: 85,
        y: 195,
        size: 13,
        font: regFont,
        color: rgb(0.82, 0.82, 0.82),
        rotate: degrees(45),
        opacity: 0.55,
      });
    };

    drawWatermark(page);

    // QR code — top-right corner
    const qrSide = 90;
    page.drawImage(qrImage, {
      x: A4_W - MARGIN - qrSide,
      y: A4_H - MARGIN - qrSide,
      width: qrSide,
      height: qrSide,
    });
    page.drawText('Scan to view', {
      x: A4_W - MARGIN - qrSide,
      y: A4_H - MARGIN - qrSide - 11,
      size: 7,
      font: regFont,
      color: GREY,
    });

    // Helpers (closures over `page` and `y`)
    const nl = (gap = 13) => { y -= gap; };
    const put = (txt, { x = MARGIN, size = 10, font = regFont, color = BLACK } = {}) => {
      page.drawText(String(txt), { x, y, size, font, color });
    };
    const hRule = (thickness = 0.5) => {
      page.drawLine({ start: { x: MARGIN, y }, end: { x: A4_W - MARGIN, y }, thickness, color: BLACK });
      nl(9);
    };
    const section = (label) => {
      page.drawRectangle({ x: MARGIN, y: y - 2, width: CONTENT_W, height: 15, color: rgb(0.12, 0.12, 0.12) });
      page.drawText(label, { x: MARGIN + 4, y, size: 10, font: boldFont, color: WHITE });
      nl(18);
    };
    const field = (label, value, truncLen = 0) => {
      page.drawText(`${label}: `, { x: MARGIN, y, size: 9.5, font: boldFont, color: BLACK });
      const labelW = boldFont.widthOfTextAtSize(`${label}: `, 9.5);
      const val = truncLen && String(value).length > truncLen
        ? String(value).slice(0, truncLen) + '...'
        : String(value || '—');
      page.drawText(val, { x: MARGIN + labelW, y, size: 9.5, font: regFont, color: BLACK });
      nl(13);
    };
    const blankField = (label, lineLen = 200) => {
      page.drawText(`${label}: `, { x: MARGIN, y, size: 9.5, font: boldFont, color: BLACK });
      const labelW = boldFont.widthOfTextAtSize(`${label}: `, 9.5);
      page.drawLine({
        start: { x: MARGIN + labelW, y: y - 1 },
        end: { x: MARGIN + labelW + lineLen, y: y - 1 },
        thickness: 0.6, color: GREY,
      });
      nl(13);
    };

    const checkboxRow = (label, items, checkedItem) => {
      put(label + ':', { size: 9.5, font: boldFont });
      const labelW = boldFont.widthOfTextAtSize(label + ': ', 9.5);
      let cx = MARGIN + labelW + 4;
      items.forEach((item) => {
        const checked = item === checkedItem;
        page.drawRectangle({
          x: cx, y: y - 2, width: 9, height: 9,
          borderColor: BLACK, borderWidth: 0.8,
          color: checked ? BLACK : WHITE,
        });
        if (checked) {
          // Draw 'x' inside box (standard font safe)
          page.drawText('X', { x: cx + 1.5, y: y - 1.5, size: 6.5, font: boldFont, color: WHITE });
        }
        page.drawText(item, { x: cx + 12, y, size: 8.5, font: regFont, color: BLACK });
        cx += regFont.widthOfTextAtSize(item, 8.5) + 22;
      });
      nl(14);
    };

    const algoRow = () => {
      put('Hash Algorithm:', { size: 9.5, font: boldFont });
      const labelW = boldFont.widthOfTextAtSize('Hash Algorithm: ', 9.5);
      let ax = MARGIN + labelW + 4;
      [['SHA-1', false], ['SHA-256', true], ['MD5', false]].forEach(([alg, checked]) => {
        page.drawRectangle({
          x: ax, y: y - 2, width: 9, height: 9,
          borderColor: BLACK, borderWidth: 0.8,
          color: checked ? BLACK : WHITE,
        });
        if (checked) page.drawText('X', { x: ax + 1.5, y: y - 1.5, size: 6.5, font: boldFont, color: WHITE });
        page.drawText(alg, { x: ax + 12, y, size: 8.5, font: regFont, color: BLACK });
        ax += regFont.widthOfTextAtSize(alg, 8.5) + 24;
      });
      nl(14);
    };

    const pageBreakIfNeeded = (needed = 180) => {
      if (y < needed) {
        page = pdfDoc.addPage([A4_W, A4_H]);
        drawWatermark(page);
        y = A4_H - MARGIN;
      }
    };

    // ── TITLE BLOCK ───────────────────────────────────────────────────────────
    y = A4_H - MARGIN - 8;
    put('CERTIFICATE', { size: 15, font: boldFont });
    nl(17);
    put('under Section 63(4)(c), Bharatiya Sakshya Adhiniyam, 2023', { size: 10.5, font: boldFont });
    nl(14);
    put(`Case: ${caseDoc.title}`, { size: 9.5, font: regFont, color: GREY });
    nl(6);
    put(`Evidence ID: ${evidence._id}`, { size: 8, font: regFont, color: GREY });
    nl(10);
    hRule(1);

    // ── PART A ───────────────────────────────────────────────────────────────
    section('PART A — Statement by Party / Custodian');

    field('Party Name', caseDoc.partyName);
    field('Party Address', caseDoc.partyAddress, 80);

    const deviceTypes = ['Computer', 'Mobile', 'Flash Drive', 'Cloud', 'Other'];
    checkboxRow('Device Type', deviceTypes, evidence.deviceType);

    field('Make & Model', evidence.makeModel);
    field('Serial No', evidence.serialNo);
    field('Device ID (IMEI / MAC / Cloud ID)', evidence.deviceId);
    field('Hash Value (SHA-256)', evidence.sha256, 72);
    algoRow();

    const firstEvt = events[0];
    const lockDate = firstEvt ? firstEvt.timestampIST.split(' ')[0] : '__/__/____';
    const lockTime = firstEvt ? firstEvt.timestampIST.split(' ').slice(1).join(' ') : '__:__:__ IST';

    field('Date', lockDate);
    field('Time', lockTime);
    blankField('Place', 220);
    nl(6);
    blankField('Signature of Party', 200);
    nl(8);
    hRule();

    // ── PART B ───────────────────────────────────────────────────────────────
    pageBreakIfNeeded(260);
    section('PART B — Statement by Expert / Examining Authority');

    blankField('Expert Name', 220);
    blankField('Designation / Organisation', 190);

    checkboxRow('Device Type', deviceTypes, evidence.deviceType);
    field('Make & Model', evidence.makeModel);
    field('Serial No', evidence.serialNo);
    field('Device ID (IMEI / MAC / Cloud ID)', evidence.deviceId);
    field('Hash Value (SHA-256)', evidence.sha256, 72);
    algoRow();
    blankField('Date', 80);
    blankField('Time', 80);
    blankField('Place', 220);
    nl(6);
    blankField('Expert Signature', 200);
    nl(8);
    hRule();

    // ── ANNEX — Chain of Custody ──────────────────────────────────────────────
    pageBreakIfNeeded(160 + events.length * 15);
    section('Annex — Chain of Custody Log');

    // Chain status badge
    const statusLabel = chainResult.ok
      ? 'Chain VERIFIED — no tampering detected'
      : `Chain BROKEN at seqNo ${chainResult.brokenAt}: ${chainResult.reason}`;
    put('Status: ', { size: 9.5, font: boldFont });
    const swOff = boldFont.widthOfTextAtSize('Status: ', 9.5);
    page.drawText(statusLabel, {
      x: MARGIN + swOff, y, size: 9.5,
      font: boldFont,
      color: chainResult.ok ? GREEN : RED,
    });
    nl(16);

    // Table header
    const COL = { seq: MARGIN, action: MARGIN + 24, actor: MARGIN + 175, role: MARGIN + 260, time: MARGIN + 320, hash: MARGIN + 428 };
    page.drawRectangle({ x: MARGIN, y: y - 2, width: CONTENT_W, height: 14, color: rgb(0.12, 0.12, 0.12) });
    [
      ['#', COL.seq],
      ['Action', COL.action],
      ['Actor', COL.actor],
      ['Role', COL.role],
      ['Timestamp IST', COL.time],
      ['Entry Hash', COL.hash],
    ].forEach(([h, x]) => page.drawText(h, { x, y, size: 7.5, font: boldFont, color: WHITE }));
    nl(15);

    // Table rows
    events.forEach((ev, i) => {
      const rowColor = i % 2 === 0 ? rgb(0.96, 0.96, 0.96) : WHITE;
      page.drawRectangle({ x: MARGIN, y: y - 3, width: CONTENT_W, height: 13, color: rowColor });

      const trunc = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));
      [
        [String(ev.seqNo), COL.seq],
        [trunc(ev.action, 28), COL.action],
        [trunc(ev.actor, 18), COL.actor],
        [ev.actorRole, COL.role],
        [ev.timestampIST.replace(' IST', ''), COL.time],
        [ev.entryHash.slice(0, 10) + '…', COL.hash],
      ].forEach(([v, x]) => page.drawText(v, { x, y, size: 7.5, font: regFont, color: BLACK }));

      nl(13);
    });

    // Bottom note
    nl(6);
    put(`Generated by Kahani Evidence Integrity Tracker  •  ${new Date().toISOString()}`, {
      size: 7.5, font: regFont, color: GREY,
    });

    // ── Serialize and send ────────────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Kahani-Certificate-${evidence._id}.pdf"`
    );
    res.end(Buffer.from(pdfBytes));
  } catch (err) {
    next(err);
  }
}
