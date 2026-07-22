// fix-encoding.mjs - Fix mojibake / double-encoded UTF-8 characters app-wide
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const FIXES = [
  // Middle dot / interpunct · (U+00B7)
  ['Â·', '·'],
  ['â€¢', '•'],
  // Arrows
  ['â†’', '→'],
  ['â‹®', '⋮'],
  // Math / Comparison
  ['â‰¤', '≤'],
  ['â‰geq', '≥'],
  // Checkmark ✅
  ['âœ…', '✅'],
  // Dashes & Quotes
  ['â€"', '—'],
  ['â€"', '–'],
  ['â€™', "'"],
  ['â€˜', "'"],
  ['â€œ', '"'],
  ['â€', '"'],
  ['â€¦', '…'],
  ['Â ', ' '],

  // Emojis & Symbols
  ['ðŸ”¥', '🔥'],
  ['ðŸ‘‹', '👋'],
  ['ðŸŽ‰', '🎉'],
  ['ðŸŽ¯', '🎯'],
  ['ðŸ”🔔', '🔔'],
  ['ðŸ”14', '🔔'],
  ['ðŸ“📱', '📱'],
  ['ðŸ“41', '📱'],
  ['ðŸ“📋', '📋'],
  ['ðŸ“cb', '📋'],
  ['ðŸ’💪', '💪'],
  ['ðŸ’aa', '💪'],
  ['ðŸ˜😊', '😊'],
  ['ðŸ˜0a', '😊'],
  ['ðŸ¤🤩', '🤩'],
  ['ðŸ¤29', '🤩'],
  ['ðŸa🚫', '🚫'],
  ['ðŸaab', '🚫'],
  ['ðŸc5', '📅'],
  ['ðŸc4', '📄'],
  ['ðŸe0', '🏠'],
  ['ðŸca', '📊'],
  ['ðŸe1', '🛡️'],
  ['ðŸa1', '💡'],
  ['ðŸ81', '🎁'],
  ['❤ï¸ ', '❤️'],
  ['â❤', '❤️'],
];

function walkDir(dir) {
  let files = [];
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) {
      files = files.concat(walkDir(full));
    } else if (/\.(jsx?|tsx?|css|html)$/.test(f)) {
      files.push(full);
    }
  }
  return files;
}

let totalFixed = 0;

for (const file of walkDir('src')) {
  let content = readFileSync(file, 'utf8');
  const orig = content;

  for (const [search, replacement] of FIXES) {
    if (content.includes(search)) {
      content = content.split(search).join(replacement);
    }
  }

  if (content !== orig) {
    writeFileSync(file, content, 'utf8');
    console.log('Fixed:', file);
    totalFixed++;
  }
}

console.log(`\nDone. Fixed ${totalFixed} file(s).`);
