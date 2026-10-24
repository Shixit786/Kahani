# Kahani Capture — Chrome Extension (Manifest V3)

A forensic browser extension to ingest, capture, and cryptographically seal live WhatsApp Web conversations directly into **Kahani Evidence Integrity Tracker** under Section 63 of Bharatiya Sakshya Adhiniyam (BSA), 2023.

---

## Features
- **Live WhatsApp Scraping**: Captures open chat name, participant timestamps, and text from `[data-pre-plain-text]` DOM elements.
- **Client-Side SHA-256**: Generates cryptographic digest in-browser via the Web Crypto API prior to transmission.
- **Synchronous Context Screenshot**: Takes a lossless PNG snapshot of the visible browser tab as corroborating evidence.
- **Privacy-by-Design**: Never inspects or transmits passwords, contacts outside the active chat, or private device fingerprints.

---

## How to Install & Load in Chrome / Edge / Brave

1. Open Google Chrome (or Microsoft Edge / Brave).
2. Navigate to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** in the top-left toolbar.
5. In the file picker, select the `d:\Kahani\extension` folder.
6. The **Kahani Capture** extension icon will now appear in your browser extension toolbar! Pin it for quick access.

---

## Usage Workflow

1. Ensure the Kahani backend (`npm run dev` in `/backend`, port 5050) and frontend are running.
2. Open [https://web.whatsapp.com](https://web.whatsapp.com) and click into the chat you wish to preserve.
3. Click the **Kahani Capture** extension icon from your browser toolbar.
4. Select the target **Case Matter** from the dropdown menu and enter your name/designation.
5. Click **Capture Last 10 Messages**.
6. The extension will automatically:
   - Extract the messages and format them as an official WhatsApp export.
   - Capture a high-resolution screenshot of the chat window.
   - Calculate client-side SHA-256 checksum.
   - Transmit to `http://localhost:5050/api/capture`.
   - Lock both the text export and screenshot into the append-only custody chain.
7. Click **Open Evidence Record →** to view the sealed evidence, forensic analysis, red flags, and download the draft Section 63 BSA certificate.
