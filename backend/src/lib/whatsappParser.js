import crypto from 'crypto';

/**
 * WhatsApp Chat Forensic Parser
 * Parses both Android ("24/10/26, 10:15 pm - Name: text")
 * and iOS ("[24/10/26, 10:15:03 PM] Name: text") formats.
 * Normalizes multi-line messages, computes line-level SHA-256 hashes,
 * and detects forensic red flags.
 */

// Regex patterns for message header detection
// Android: 24/10/26, 10:15 pm - Sender: Message or 24/10/2026, 10:15:22 - Sender: Message
const ANDROID_HEADER_REGEX = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:[\s\u202F]?[apAP][mM])?)\s+-\s+(.+)$/;

// iOS: [24/10/26, 10:15:03 PM] Sender: Message
const IOS_HEADER_REGEX = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:[\s\u202F]?[apAP][mM])?)\]\s+(.+)$/;

export function parseWhatsAppChat(rawText, uploadDate = new Date()) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      messages: [],
      redFlags: [{ rule: 'empty_file', severity: 'HIGH', message: 'Chat file is empty or invalid.' }],
      senders: [],
      deletions: 0,
      edits: 0,
      systemEvents: 0,
    };
  }

  const lines = rawText.split(/\r?\n/);
  const parsedEntries = [];
  let currentEntry = null;
  const unparseableLines = [];

  // Red flag tracking
  let hasEncryptionHeader = false;
  let androidFormatCount = 0;
  let iosFormatCount = 0;
  let u202fSpaceCount = 0;
  let normalSpaceCount = 0;
  let editedCount = 0;
  let deletedCount = 0;
  let systemEventCount = 0;
  let hasDisappearingMessages = false;
  let securityCodeChanged = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Check for U+202F narrow no-break space
    if (line.includes('\u202F')) u202fSpaceCount++;
    if (/\s[apAP][mM]/.test(line)) normalSpaceCount++;

    let match = line.match(ANDROID_HEADER_REGEX);
    let format = 'android';

    if (!match) {
      match = line.match(IOS_HEADER_REGEX);
      format = 'ios';
    }

    if (match) {
      if (format === 'android') androidFormatCount++;
      if (format === 'ios') iosFormatCount++;

      const [, datePart, timePart, rest] = match;
      const colonIdx = rest.indexOf(': ');

      let sender = '';
      let text = '';
      let type = 'message';

      if (colonIdx !== -1) {
        sender = rest.slice(0, colonIdx).trim();
        text = rest.slice(colonIdx + 2);
      } else {
        // System event (no colon separator)
        type = 'system';
        sender = 'System';
        text = rest.trim();
      }

      // Check for encryption header
      if (
        text.includes('Messages and calls are end-to-end encrypted') ||
        text.includes('end-to-end encrypted')
      ) {
        hasEncryptionHeader = true;
        type = 'system';
      }

      // Classify message contents
      if (text.includes('<Media omitted>') || text.includes('(file attached)')) {
        type = 'media';
      } else if (
        text.includes('This message was deleted') ||
        text.includes('You deleted this message')
      ) {
        type = 'deleted';
        deletedCount++;
      } else if (text.includes('<This message was edited>') || text.endsWith(' (edited)')) {
        type = 'edited';
        editedCount++;
      } else if (
        text.includes('security code changed') ||
        text.includes('security code has changed') ||
        text.includes('changed their phone number')
      ) {
        type = 'system';
        securityCodeChanged = true;
        systemEventCount++;
      } else if (
        text.includes('disappearing messages') ||
        text.includes('turned on disappearing messages')
      ) {
        type = 'system';
        hasDisappearingMessages = true;
        systemEventCount++;
      } else if (type === 'system') {
        systemEventCount++;
      }

      // Compute normalized line hash
      const normalizedStr = `${datePart.trim()}|${timePart.trim()}|${sender.trim()}|${text.trim()}`;
      const lineHash = crypto.createHash('sha256').update(normalizedStr).digest('hex');

      if (currentEntry) {
        parsedEntries.push(currentEntry);
      }

      currentEntry = {
        lineIndex: i + 1,
        date: datePart.trim(),
        time: timePart.trim(),
        sender: sender.trim(),
        text: text,
        type,
        lineHash,
      };
    } else {
      // Continuation of previous message (multi-line message)
      if (currentEntry) {
        currentEntry.text += '\n' + line;
        // Update line hash with appended text
        const normalizedStr = `${currentEntry.date}|${currentEntry.time}|${currentEntry.sender}|${currentEntry.text.trim()}`;
        currentEntry.lineHash = crypto.createHash('sha256').update(normalizedStr).digest('hex');
      } else {
        unparseableLines.push({ lineIndex: i + 1, text: line });
      }
    }
  }

  if (currentEntry) {
    parsedEntries.push(currentEntry);
  }

  // Sender extraction and phone check
  const senderSet = new Set();
  const senders = [];
  parsedEntries.forEach((m) => {
    if (m.sender && m.sender !== 'System' && !senderSet.has(m.sender)) {
      senderSet.add(m.sender);
      // Determine if sender has phone number format (e.g. +91 98765 43210 or 9876543210)
      const isPhone = /^[+]?[\d\s-]{10,}$/.test(m.sender);
      senders.push({
        label: m.sender,
        phoneNumber: isPhone ? m.sender : '',
        source: isPhone ? 'in-file' : 'user-entered',
      });
    }
  });

  // Forensic Red Flags Detection
  const redFlags = [];

  // Flag 1: Missing encryption header
  if (!hasEncryptionHeader) {
    redFlags.push({
      id: 'missing_encryption_header',
      severity: 'MEDIUM',
      title: 'Missing Encryption Header',
      description:
        'Standard WhatsApp exports begin with "Messages and calls are end-to-end encrypted". Its absence suggests the export may have been cropped or manually drafted.',
    });
  }

  // Flag 2: Mixed date/time formats
  if (androidFormatCount > 0 && iosFormatCount > 0) {
    redFlags.push({
      id: 'mixed_formats',
      severity: 'HIGH',
      title: 'Mixed Android & iOS Message Formats',
      description: `Detected ${androidFormatCount} Android headers and ${iosFormatCount} iOS headers in the same export. A single native export never mixes operating system formats.`,
    });
  }

  // Flag 3: Mixed U+202F vs standard space before am/pm
  if (u202fSpaceCount > 0 && normalSpaceCount > 0) {
    redFlags.push({
      id: 'mixed_unicode_spaces',
      severity: 'MEDIUM',
      title: 'Mixed Unicode Space Encodings',
      description: `File mixes standard spaces (${normalSpaceCount}) and narrow non-breaking spaces U+202F (${u202fSpaceCount}). This often occurs when copy-pasting from multiple sources.`,
    });
  }

  // Flag 4: Unparseable lines
  if (unparseableLines.length > 0) {
    redFlags.push({
      id: 'unparseable_lines',
      severity: 'MEDIUM',
      title: `${unparseableLines.length} Unparseable / Orphan Lines`,
      description: 'Found lines prior to any valid message timestamp header.',
    });
  }

  // Flag 5: Senders with name only (no phone number)
  const nameOnlySenders = senders.filter((s) => !s.phoneNumber);
  if (nameOnlySenders.length > 0) {
    redFlags.push({
      id: 'sender_name_only',
      severity: 'MEDIUM',
      title: 'Contact Saved by Name Only',
      description: `Senders [${nameOnlySenders.map((s) => s.label).join(', ')}] appear as names without an international phone number. Anyone can rename an address book entry. Corroboration via telecom records is advised.`,
    });
  }

  // Flag 6: Edited messages
  if (editedCount > 0) {
    redFlags.push({
      id: 'edited_messages',
      severity: 'LOW',
      title: `${editedCount} Edited Message(s)`,
      description: 'Contains messages modified after initial transmission. Original pre-edit content is not preserved in export.',
    });
  }

  // Flag 7: Security code or phone number changes
  if (securityCodeChanged) {
    redFlags.push({
      id: 'security_code_changed',
      severity: 'MEDIUM',
      title: 'Security Code or SIM Reinstall Event',
      description: 'One or more participants reinstalled WhatsApp, changed devices, or swapped SIM cards during the chat window.',
    });
  }

  // Flag 8: Disappearing messages
  if (hasDisappearingMessages) {
    redFlags.push({
      id: 'disappearing_messages',
      severity: 'LOW',
      title: 'Disappearing Messages Active',
      description: 'Disappearing messages feature was enabled during conversation history.',
    });
  }

  // Flag 9: Chronological order check
  let isNonChronological = false;
  let prevTimestamp = 0;
  for (const m of parsedEntries) {
    // Attempt parse
    try {
      const parts = m.date.split('/');
      if (parts.length === 3) {
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[0], 10);
        const curDate = new Date(year, month, day).getTime();
        if (prevTimestamp && curDate < prevTimestamp) {
          isNonChronological = true;
          break;
        }
        prevTimestamp = curDate;
      }
    } catch {
      // ignore date parse error
    }
  }

  if (isNonChronological) {
    redFlags.push({
      id: 'non_chronological',
      severity: 'HIGH',
      title: 'Non-Chronological Message Order',
      description: 'Timestamps do not progress strictly forward in time. Messages appear out of sequence.',
    });
  }

  // Flag 10: >24h gap between last message and upload date
  if (parsedEntries.length > 0) {
    try {
      const last = parsedEntries[parsedEntries.length - 1];
      const parts = last.date.split('/');
      if (parts.length === 3) {
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        const lastMsgDate = new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        const diffHours = (uploadDate.getTime() - lastMsgDate.getTime()) / (1000 * 60 * 60);
        if (diffHours > 24) {
          redFlags.push({
            id: 'export_delay',
            severity: 'LOW',
            title: `Export Gap (>24h)`,
            description: `Last message occurred ${Math.floor(diffHours / 24)} day(s) before upload into repository. Verify if subsequent messages were omitted.`,
          });
        }
      }
    } catch {
      // Ignore
    }
  }

  return {
    messages: parsedEntries,
    redFlags,
    senders,
    deletions: deletedCount,
    edits: editedCount,
    systemEvents: systemEventCount,
  };
}
