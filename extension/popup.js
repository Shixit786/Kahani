// Kahani Capture - Extension Popup Logic

const BACKEND_URL = 'http://localhost:5050';
const FRONTEND_URL = 'http://localhost:5173';

async function computeSha256(str) {
  const enc = new TextEncoder();
  const buffer = enc.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  const caseSelect = document.getElementById('caseSelect');
  const capturedByInput = document.getElementById('capturedBy');
  const captureBtn = document.getElementById('captureBtn');
  const statusEl = document.getElementById('status');

  function showStatus(text, type = 'success', html = '') {
    statusEl.className = type === 'success' ? 'status-success' : 'status-error';
    statusEl.innerHTML = html || text;
    statusEl.style.display = 'block';
  }

  // Load active cases
  try {
    const res = await fetch(`${BACKEND_URL}/api/cases`);
    const cases = await res.json();
    caseSelect.innerHTML = '';
    if (cases && cases.length > 0) {
      cases.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c._id;
        opt.textContent = `${c.title} (${c.partyName})`;
        caseSelect.appendChild(opt);
      });
    } else {
      caseSelect.innerHTML = '<option value="">No cases created yet</option>';
    }
  } catch (err) {
    caseSelect.innerHTML = '<option value="">Error connecting to backend</option>';
  }

  captureBtn.addEventListener('click', async () => {
    const caseId = caseSelect.value;
    const capturedBy = capturedByInput.value.trim() || 'Investigator';

    if (!caseId) {
      showStatus('Please select a case matter first.', 'error');
      return;
    }

    captureBtn.disabled = true;
    captureBtn.textContent = 'Inspecting open WhatsApp chat...';

    try {
      // Query active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !tab.url.includes('web.whatsapp.com')) {
        showStatus('Please switch to an active web.whatsapp.com tab.', 'error');
        captureBtn.disabled = false;
        captureBtn.textContent = 'Capture Last 10 Messages';
        return;
      }

      // Execute extraction content script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractWhatsAppChat,
      });

      const extracted = results?.[0]?.result;
      if (!extracted || !extracted.success) {
        showStatus(extracted?.error || 'Open a chat first', 'error');
        captureBtn.disabled = false;
        captureBtn.textContent = 'Capture Last 10 Messages';
        return;
      }

      // Capture screenshot of visible tab
      let screenshotBase64 = null;
      try {
        screenshotBase64 = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      } catch (e) {
        console.warn('Screenshot capture skipped:', e);
      }

      // Compute client SHA-256
      const clientSha256 = await computeSha256(extracted.txtContent);

      captureBtn.textContent = 'Sealing hash on server...';

      // POST to backend capture API
      const response = await fetch(`${BACKEND_URL}/api/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          chatName: extracted.chatName,
          messages: extracted.messages,
          txtContent: extracted.txtContent,
          clientSha256,
          screenshotBase64,
          capturedBy,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server rejected capture');
      }

      const shortHash = `${data.sha256.slice(0, 8)}…${data.sha256.slice(-8)}`;
      const evidenceUrl = `${FRONTEND_URL}/evidence/${data.textEvidenceId}`;

      showStatus(
        '',
        'success',
        `<strong>Captured & hash locked ✓</strong><br>
        Chat: ${extracted.chatName}<br>
        IST Time: ${data.lockedAtIST}<br>
        <div class="hash-val">SHA-256: ${shortHash}</div>
        <a class="link" href="${evidenceUrl}" target="_blank">Open Evidence Record →</a>`
      );
    } catch (err) {
      showStatus(err.message || 'Capture failed', 'error');
    } finally {
      captureBtn.disabled = false;
      captureBtn.textContent = 'Capture Last 10 Messages';
    }
  });
});

// Function injected into web.whatsapp.com to scrape chat
function extractWhatsAppChat() {
  try {
    // 1. Locate chat title in header
    const headerEl = document.querySelector('header span[title]') || document.querySelector('#main header span[dir="auto"]');
    const chatName = headerEl ? headerEl.getAttribute('title') || headerEl.textContent.trim() : 'WhatsApp Chat';

    // 2. Select last 10 messages with [data-pre-plain-text]
    const messageContainers = Array.from(document.querySelectorAll('[data-pre-plain-text]'));
    if (messageContainers.length === 0) {
      return { success: false, error: 'Open a chat first' };
    }

    const last10 = messageContainers.slice(-10);
    const messages = [];
    const txtLines = [
      `Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.`,
    ];

    last10.forEach((el) => {
      const preText = el.getAttribute('data-pre-plain-text') || '';
      // Example preText: "[10:15 pm, 24/10/2026] Rahul: "
      const textSpan = el.querySelector('.selectable-text') || el;
      const text = textSpan.textContent.trim();

      // Format as standard export: [date, time] Sender: Text
      txtLines.push(`${preText}${text}`);
      messages.push({
        header: preText,
        text,
      });
    });

    const txtContent = txtLines.join('\n');
    return {
      success: true,
      chatName,
      messages,
      txtContent,
    };
  } catch (e) {
    return { success: false, error: e.message || 'Failed to scrape chat elements' };
  }
}
