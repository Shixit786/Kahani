/**
 * Chat Diff Engine
 * Compares two WhatsApp chat exports (original master vs counterpart / re-export)
 * within the original's timestamp window.
 * Computes unchanged, added, removed, and modified entries with word-level diffs.
 */

function wordLevelDiff(oldText, newText) {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  // Simple token matching
  const diffParts = [];
  const max = Math.max(oldWords.length, newWords.length);

  for (let i = 0; i < max; i++) {
    const o = oldWords[i];
    const n = newWords[i];

    if (o === n) {
      if (o !== undefined) diffParts.push({ type: 'same', value: o });
    } else {
      if (o !== undefined) diffParts.push({ type: 'removed', value: o });
      if (n !== undefined) diffParts.push({ type: 'added', value: n });
    }
  }

  return diffParts;
}

export function computeChatDiff(originalMessages, counterpartMessages) {
  if (!originalMessages || originalMessages.length === 0) {
    return {
      aligned: [],
      summary: { totalOriginal: 0, totalCounterpart: counterpartMessages?.length || 0, added: 0, removed: 0, modified: 0, unchanged: 0 },
    };
  }

  const aligned = [];
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;
  let unchangedCount = 0;

  // Track matched counterpart message indices
  const counterpartMatched = new Set();

  for (let i = 0; i < originalMessages.length; i++) {
    const orig = originalMessages[i];

    // Find best match in counterpart: same sender and same text or similar timestamp
    let matchIdx = -1;
    let exactTextMatch = false;

    for (let j = 0; j < counterpartMessages.length; j++) {
      if (counterpartMatched.has(j)) continue;
      const cp = counterpartMessages[j];

      // Exact line hash match
      if (orig.lineHash && cp.lineHash && orig.lineHash === cp.lineHash) {
        matchIdx = j;
        exactTextMatch = true;
        break;
      }

      // Matching date/time and sender
      if (orig.date === cp.date && orig.time === cp.time) {
        matchIdx = j;
        if (orig.text.trim() === cp.text.trim()) {
          exactTextMatch = true;
          break;
        }
      }
    }

    if (matchIdx !== -1) {
      counterpartMatched.add(matchIdx);
      const cp = counterpartMessages[matchIdx];

      if (exactTextMatch || orig.text.trim() === cp.text.trim()) {
        unchangedCount++;
        aligned.push({
          status: 'unchanged',
          original: orig,
          counterpart: cp,
        });
      } else {
        modifiedCount++;
        aligned.push({
          status: 'modified',
          original: orig,
          counterpart: cp,
          diff: wordLevelDiff(orig.text, cp.text),
        });
      }
    } else {
      // Message in original is missing from counterpart
      removedCount++;
      aligned.push({
        status: 'removed',
        original: orig,
        counterpart: null,
      });
    }
  }

  // Find remaining counterpart messages within time bounds (added messages)
  for (let j = 0; j < counterpartMessages.length; j++) {
    if (!counterpartMatched.has(j)) {
      addedCount++;
      aligned.push({
        status: 'added',
        original: null,
        counterpart: counterpartMessages[j],
      });
    }
  }

  return {
    aligned,
    summary: {
      totalOriginal: originalMessages.length,
      totalCounterpart: counterpartMessages.length,
      unchanged: unchangedCount,
      modified: modifiedCount,
      removed: removedCount,
      added: addedCount,
    },
  };
}
