// Summarizes Claude's response into ONE short spoken sentence
// Smart local extraction — no API key needed

// ──────────────────────────────────────────────
// Main entry point
// ──────────────────────────────────────────────

function summarize(text, context) {
  return Promise.resolve(localSummarize(text, context));
}

function localSummarize(text, context) {
  if (!text || text.length < 5) return reiify('Owarimashita.', context);

  const clean = stripMarkdown(text);
  if (!clean || clean.length < 5) return reiify('Owarimashita.', context);

  if (context === 'session_start') return 'Junbi, kanryou.';
  if (context === 'error') return reiify(extractError(clean), context);
  if (context === 'prompt_submit') return reiify(extractIntent(clean), context);
  return reiify(extractResult(clean), context);
}

// ──────────────────────────────────────────────
// Rei-ify: soft Japanese cadence on spoken phrases
// ──────────────────────────────────────────────

function reiify(s, context) {
  if (!s) return s;
  // Strip trailing punctuation so we can append cleanly
  const core = s.replace(/[.!?]+\s*$/, '');
  if (context === 'error') {
    return `Ara... ${core}, desu.`;
  }
  if (context === 'prompt_submit') {
    return `Hai. ${core}, ne.`;
  }
  // stop / default — completion
  return `${core}... desu.`;
}

// ──────────────────────────────────────────────
// Strip all markdown to plain spoken text
// ──────────────────────────────────────────────

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')                     // code blocks
    .replace(/`([^`]+)`/g, '$1')                         // inline code → plain
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')             // links → text
    .replace(/#{1,6}\s+/g, '')                           // headers
    .replace(/[*_~]{1,3}/g, '')                          // bold/italic/strike
    .replace(/^\s*[-•●▸>]\s+/gm, '')                     // bullets/blockquotes
    .replace(/^\s*\d+\.\s+/gm, '')                       // numbered lists
    .replace(/\|[^\n]+\|/g, '')                           // tables
    .replace(/\([\w./:~-]+\)/g, '')                       // parenthetical paths
    .replace(/\bhttps?:\/\/\S+/g, '')                     // URLs
    .replace(/\n{2,}/g, '. ')                             // paragraph breaks → sentence
    .replace(/\n/g, ' ')                                  // single newlines → space
    .replace(/\.\s*\./g, '.')                             // double periods
    .replace(/\s{2,}/g, ' ')                              // collapse whitespace
    .trim();
}

// ──────────────────────────────────────────────
// Extract core RESULT from Claude's response
// ──────────────────────────────────────────────

function extractResult(clean) {
  const sentences = splitSentences(clean);
  if (!sentences.length) return cap(clean);

  // Priority 1: "Done" / "All X" summary sentences (often at the end)
  for (let i = sentences.length - 1; i >= Math.max(0, sentences.length - 3); i--) {
    const s = sentences[i];
    if (/\b(?:done|all\s+\w+\s+(?:are|have|is)|everything|that's it|ready to|complete)\b/i.test(s) && s.length > 8) {
      return cap(s);
    }
  }

  // Priority 2: sentences with strong completion verbs
  const completionRe = /\b(?:fixed|created|updated|added|removed|installed|built|deployed|resolved|refactored|configured|compiled|generated|wrote|moved|renamed|deleted|merged|set up|wired up|replaced|implemented|enabled|disabled|connected|migrated)\b/i;
  for (const s of sentences) {
    if (completionRe.test(s) && s.length > 12) return cap(s);
  }

  // Priority 3: "I've" / "I" action statements
  for (const s of sentences) {
    if (/^I(?:'ve|'m| have| just)?\s/i.test(s) && s.length > 12) return cap(s);
  }

  // Priority 4: sentences describing new state
  const stateRe = /\b(?:now|should|will|can|works|working|ready|available|enabled|running|active|passing)\b/i;
  for (const s of sentences) {
    if (stateRe.test(s) && s.length > 12) return cap(s);
  }

  // Fallback: first substantial sentence
  for (const s of sentences) {
    if (s.length > 12) return cap(s);
  }
  return cap(sentences[0]);
}

// ──────────────────────────────────────────────
// Extract ERROR message
// ──────────────────────────────────────────────

function extractError(clean) {
  const sentences = splitSentences(clean);
  if (!sentences.length) return cap(clean);

  const errorRe = /\b(?:error|failed|failure|cannot|couldn't|can't|unable|not found|missing|broken|invalid|denied|timeout|crash|exception|unexpected|refused)\b/i;
  for (const s of sentences) {
    if (errorRe.test(s) && s.length > 8) return cap(s);
  }
  return cap(sentences[0]);
}

// ──────────────────────────────────────────────
// Extract user INTENT from their prompt
// ──────────────────────────────────────────────

function extractIntent(clean) {
  // Strip politeness
  let s = clean.replace(/^(?:hey|hi|hello|yo|please|can you|could you|would you|I need you to|I want you to|I'd like you to)\s+/i, '');

  // Take first sentence/clause
  const match = s.match(/^[^.!?\n]+/);
  if (match) s = match[0].trim();

  // Make it narrator-style: capitalize, add period
  if (s.length < 5) return null;
  return cap(s);
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function splitSentences(text) {
  // Split on sentence-ending punctuation, keeping the punctuation
  const raw = text.match(/[^.!?]+[.!?]+/g);
  if (!raw) return [text];
  return raw.map(s => s.trim()).filter(s => s.length > 3);
}

function cap(s) {
  if (!s) return 'Done.';
  // Strip leading conjunctions
  s = s.replace(/^(?:and|but|so|also|then|next|finally|additionally|furthermore)\s+/i, '').trim();
  // Capitalize first letter
  s = s.charAt(0).toUpperCase() + s.slice(1);
  // Trim to 65 chars max at word boundary for spoken brevity
  if (s.length > 65) {
    s = s.slice(0, 62).replace(/\s+\S*$/, '') + '.';
  }
  // Ensure ends with punctuation
  if (!/[.!?]$/.test(s)) s += '.';
  return s;
}

module.exports = { summarize, localSummarize };
