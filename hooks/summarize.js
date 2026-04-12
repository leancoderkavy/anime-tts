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
// Rei-ify: soft Japanese cadence + random anime phrases
// ──────────────────────────────────────────────

const ANIME_PHRASES = {
  stop: [
    'Yatta',          // we did it
    'Dekita',         // it's done
    'Owarimashita',   // it's finished
    'Kanryou',        // complete
    'Mou ichido',     // once more (ready for next)
    'Daijoubu',       // it's okay
    'Saikou',         // the best
    'Sasuga',         // as expected (impressive)
    'Subarashii',     // wonderful
    'Ii kanji',       // good feeling
  ],
  error: [
    'Ara ara',        // oh my
    'Maa maa',        // well well
    'Shimatta',       // damn it
    'Komatta na',     // troubled
    'Chigau',         // it's wrong
    'Dame da',        // no good
    'Hidoi',          // terrible
    'Muri da',        // impossible
  ],
  prompt_submit: [
    'Hai',            // yes
    'Wakatta',        // understood
    'Ryoukai',        // roger / got it
    'Makasete',       // leave it to me
    'Ikuyo',          // here we go
    'Ganbarimasu',    // I'll do my best
    'Hajimemashou',   // let's begin
    'Mochiron',       // of course
  ],
};

function pickPhrase(context) {
  const pool = ANIME_PHRASES[context] || ANIME_PHRASES.stop;
  return pool[Math.floor(Math.random() * pool.length)];
}

function reiify(s, context) {
  if (!s) return s;
  const core = s.replace(/[.!?]+\s*$/, '');
  const phrase = pickPhrase(context);
  if (context === 'error') {
    return `${phrase}... ${core}, desu.`;
  }
  if (context === 'prompt_submit') {
    return `${phrase}. ${core}, ne.`;
  }
  return `${phrase}. ${core}... desu ne.`;
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

  const completionRe = /\b(?:fixed|created|updated|added|removed|installed|built|deployed|resolved|refactored|configured|compiled|generated|wrote|moved|renamed|deleted|merged|set up|wired up|replaced|implemented|enabled|disabled|connected|migrated|rewrote|extracted|cleaned)\b/i;
  const stateRe = /\b(?:now|should|will|works|working|ready|available|enabled|running|active|passing|complete|done)\b/i;
  const summaryRe = /\b(?:done|everything|that's it|ready to|complete|all\s+\w+\s+(?:are|have|is))\b/i;
  const actionRe = /^I(?:'ve|'m| have| just)?\s/i;

  // Pick ACTION sentence — what was done
  let action = null;
  for (const s of sentences) {
    if (completionRe.test(s) && s.length > 12) { action = s; break; }
  }
  if (!action) {
    for (const s of sentences) {
      if (actionRe.test(s) && s.length > 12) { action = s; break; }
    }
  }

  // Pick OUTCOME sentence — current state / what's next
  let outcome = null;
  for (let i = sentences.length - 1; i >= 0; i--) {
    const s = sentences[i];
    if (s === action) continue;
    if (summaryRe.test(s) && s.length > 8) { outcome = s; break; }
  }
  if (!outcome) {
    for (let i = sentences.length - 1; i >= 0; i--) {
      const s = sentences[i];
      if (s === action) continue;
      if (stateRe.test(s) && s.length > 10) { outcome = s; break; }
    }
  }

  // Combine for whole picture
  if (action && outcome) {
    return capLong(`${stripPeriod(action)}, ${lowerFirst(outcome)}`);
  }
  if (action) return capLong(action);
  if (outcome) return capLong(outcome);

  // Fallback: longest substantial sentence
  const subs = sentences.filter(s => s.length > 12);
  if (subs.length) return capLong(subs[0]);
  return cap(sentences[0]);
}

function stripPeriod(s) {
  return s.replace(/[.!?]+\s*$/, '');
}

function lowerFirst(s) {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function capLong(s) {
  if (!s) return 'Done.';
  s = s.replace(/^(?:and|but|so|also|then|next|finally|additionally|furthermore)\s+/i, '').trim();
  s = s.charAt(0).toUpperCase() + s.slice(1);
  // Allow longer summary so the whole picture fits — ~160 chars
  if (s.length > 160) {
    s = s.slice(0, 157).replace(/\s+\S*$/, '') + '.';
  }
  if (!/[.!?]$/.test(s)) s += '.';
  return s;
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
