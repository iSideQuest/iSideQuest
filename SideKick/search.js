const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
const needles = ['random-first', 'duel-1st', 'duel1st', 'randomFirst', 'first-opt'];
lines.forEach((l, i) => {
  needles.forEach(n => {
    if (l.includes(n)) console.log((i + 1) + ' [' + n + ']: ' + l.trim().slice(0, 110));
  });
});