const fs = require('fs');
let lines = fs.readFileSync('index.html', 'utf8').split('\n');
let changed = 0;
for (let i = 0; i < lines.length; i++) {
  let l = lines[i];
  if (/^\s*\/\//.test(l)) continue;               // skip comment-only lines
  if (l.includes('unauthorized-domain')) continue; // instructional error string, set via textContent
  if (!l.includes('▶') && !l.includes('◀')) continue;
  const before = l;
  l = l.split('▶').join('<span class="play-tri">▶</span>');
  l = l.split('◀').join('<span class="play-tri">◀</span>');
  if (l.includes('.textContent =') && l.includes('play-tri')) {
    l = l.split('.textContent =').join('.innerHTML =');
  }
  if (l !== before) { lines[i] = l; changed++; }
}
fs.writeFileSync('index.html', lines.join('\n'), 'utf8');
console.log('changed lines: ' + changed);