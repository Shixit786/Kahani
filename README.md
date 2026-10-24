# Kahani (कहानी) — Electronic Evidence Integrity & Custody Tracker

> **PS-11 Problem Statement**: In Indian legal proceedings under the Bharatiya Sakshya Adhiniyam (BSA), 2023, digital evidence such as WhatsApp chat exports, call recordings, and CCTV clips are routinely contested for authenticity and chain of custody gaps. Fabricated screenshots and manipulated exports frequently lead to trial delays and wrongful allegations. Kahani creates an immutable cryptographic bridge from device seizure to courtroom presentation with Section 63 BSA compliance.

---

## Key Features

1. **Client & Server Dual Hashing (SHA-256)**:
   - In-browser cleanroom hashing (`crypto.subtle`) prior to transmission.
   - Streaming server-side SHA-256 verification (409 conflict guard against transit tampering).
   - Real-time laser scanning animation during byte ingestion.

2. **Tamper-Evident Hash Chain (Chain of Custody)**:
   - Append-only cryptographic ledger (`entryHash = SHA256(canonical(prevHash + seqNo + payload))`).
   - Genesis block anchored with 64 zero bits.
   - Built-in live audit algorithm (`/api/evidence/:id/verify-chain`) that detects any altered byte or timestamp in milliseconds and pinpoints the exact compromised node.

3. **Section 63(4)(c) BSA 2023 Certificate**:
   - Generates official court-ready certificate PDF using `pdf-lib`.
   - Incorporates Part A (Party / Custodian declaration) and Part B (Competent Official / Expert endorsement).
   - Scannable QR code directing magistrates to the public verification portal.

4. **Forensic WhatsApp Chat Engine**:
   - Classifies messages, media, deleted items, edited text, and security code changes.
   - Line-level SHA-256 hashing for granular verification.
   - Automatic detection of 10 red flags (e.g. missing encryption headers, mixed Unicode `U+202F` spaces, non-chronological lines, name-only senders).

5. **Independent Corroboration & Trust Scoring**:
   - **Low**: Self-reported file alone (regardless of format quality).
   - **Medium**: Counterpart export matched, fresh re-export, or telecom KYC confirmed.
   - **High**: ≥2 independent items corroborated + signed expert certificate.
   - Automatic draft generation of Section 94 BNSS notices for Telecom KYC (CAF) and Call Detail Records (CDR).

6. **Side-by-Side Cryptographic Diff Engine**:
   - Aligns original master chat against counterpart party exports within the same time window.
   - Highlights added, removed, and word-level modified lines.

7. **RFC 3161 Trusted Timestamping (FreeTSA)**:
   - External timestamp tokens anchored via `freetsa.org/tsr`.

8. **Public Trustless Verification Portal (`/verify/:id`)**:
   - Offline CLI commands (`certutil -hashfile <file> SHA256` / `sha256sum <file>`) enabling verification without trusting the website.

9. **Kahani Capture — Manifest V3 Chrome Extension**:
   - Direct one-click capture from WhatsApp Web with contextual screenshots and instant hash locking.

---

## System Architecture

```text
+-----------------------------------------------------------------------------------+
|                                  KAHANI CLIENTS                                   |
|                                                                                   |
|  [ Web Application: React + TS + Tailwind ]       [ Chrome Extension: MV3 ]       |
|    - Case workspace & evidence register             - WhatsApp Web live capture   |
|    - In-browser crypto.subtle live hashing          - Visible tab screenshot      |
|    - Forensic report, timeline & diff engine        - Dual SHA-256 seal           |
+----------------------------------------+------------------------------------------+
                                         | HTTP / REST (CORS enabled)
                                         v
+-----------------------------------------------------------------------------------+
|                              EXPRESS BACKEND (Node.js)                            |
|                                                                                   |
|   /api/cases            /api/evidence            /api/capture      /api/demo      |
|        |                      |                       |                 |         |
|   +----+----+            +----+----+             +----+----+       +----+----+    |
|   | Case    |            | Multi-part |         | Extension |       | Tamper  |    |
|   | Manager |            | Ingestion  |         | Processor |       | Inject  |    |
|   +---------+            +---------+--+         +---------+-+       +---------+    |
|                                    |                      |                       |
|                          +---------v----------------------v---------+             |
|                          |    Integrity Engine (integrity.js)       |             |
|                          |    - SHA-256 Streaming Checksum          |             |
|                          |    - Append-only Custody Hash Chain      |             |
|                          |    - RFC 3161 FreeTSA TSR Anchor         |             |
|                          |    - WhatsApp Parser & Red Flag Engine   |             |
|                          |    - Word-Level Diff Align Engine        |             |
|                          +-------------------+----------------------+             |
+----------------------------------------------|------------------------------------+
                                               v
+-----------------------------------------------------------------------------------+
|                               STORAGE & PERSISTENCE                               |
|                                                                                   |
|   [ MongoDB Collections ]                            [ File Storage ]             |
|   - Cases                                            - uploads/<caseId>/<file>    |
|   - Evidence (metadata, senderMap, trustLevel)       - uploads/linked/<parentId>/ |
|   - CustodyEvents (prevHash, entryHash, IST time)                                 |
+-----------------------------------------------------------------------------------+
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript 5, Vite 5, TailwindCSS v3, React Router v6, Lucide Icons, Axios |
| **Backend** | Node.js (ES Modules), Express.js, Mongoose, Multer, `pdf-lib`, `qrcode`, `crypto` |
| **Extension** | Chrome Manifest V3, Web Crypto API, Chrome Scripting & Tabs API |
| **Database** | MongoDB |
| **Fonts** | Instrument Serif (Display Accents), Inter (Interface), JetBrains Mono (Hashes) |

---

## Running the Application Locally

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on `mongodb://127.0.0.1:27017/kahani` (or configured via `.env`)

### 1. Backend Setup
```bash
cd backend
npm install
npm run seed     # Seeds realistic Meena WhatsApp case + counterpart chat
npm run dev      # Runs on http://localhost:5050
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Runs on http://localhost:5173
```

### 3. Load the Chrome Extension
1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select `d:\Kahani\extension`.
4. Open WhatsApp Web (`web.whatsapp.com`), click the Kahani icon, and capture live chats.

---

## API Routes Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/cases` | List all cases with evidence counts |
| `POST` | `/api/cases` | Create a new case matter |
| `GET` | `/api/cases/:id` | Case details with evidence list |
| `POST` | `/api/cases/:id/evidence` | Ingest evidence with BNS declaration & dual SHA-256 |
| `GET` | `/api/evidence/:id` | Evidence record with custody chain |
| `POST` | `/api/evidence/:id/events` | Append new custody event to chain |
| `POST` | `/api/evidence/:id/verify-file` | Re-verify uploaded file against sealed SHA-256 |
| `GET` | `/api/evidence/:id/verify-chain` | Cryptographic audit of custody hash chain |
| `GET` | `/api/evidence/:id/certificate` | Section 63 BSA certificate PDF download |
| `GET` | `/api/evidence/:id/analysis` | WhatsApp forensic parser (red flags, messages, senders) |
| `POST` | `/api/evidence/:id/sender-map` | Map participant label to verified phone number |
| `POST` | `/api/evidence/:id/corroboration/:item` | Update corroboration status & recompute trust |
| `POST` | `/api/evidence/:id/counterpart` | Upload counterpart export & generate word-level diff |
| `POST` | `/api/evidence/:id/reexport` | Upload fresh device re-export & compute diff |
| `GET` | `/api/evidence/:id/legal-request?type=kyc\|cdr` | Generate Section 94 BNSS draft notice |
| `GET` | `/api/evidence/:id/tsr` | RFC 3161 FreeTSA token & time details |
| `POST` | `/api/capture` | Extension live chat & screenshot ingestion |
| `POST` | `/api/demo/tamper/:evidenceId` | Demo route: alters event #2 in database |

---

## Limitations & Honest Forensic Scope

1. **Integrity vs. Authenticity**: Cryptographic hashes prove that a file has **not been altered after the moment of capture / ingestion**. They do not prove that the initial exported text was not fabricated prior to capture.
2. **Trust Origin**: Real forensic trust does not come from a single `.txt` file alone; it requires **independent corroboration** (telecom KYC, Call Detail Records, physical device extractions with write-blockers).
3. **Role of Human Experts**: Kahani automates audit trails and flags red flags, but Section 63 BSA certificates require review and formal signature by a certified human expert or competent officer.
4. **Zero Interception**: Kahani never intercepts, snoops, or accesses third-party devices remotely. All evidence is submitted through legal custody seizure or lawful party submission.
