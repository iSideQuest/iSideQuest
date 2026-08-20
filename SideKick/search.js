const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('img/svg/') && (l.includes('LArrow') || l.includes('RArrow') || l.includes('PassLeft') || l.includes('PassRight'))) {
    console.log((i + 1) + ': ' + l.trim().slice(0, 150));
  }
});