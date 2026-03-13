const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
let s = fs.readFileSync(path.join(root, '_plans/gezi_2.svg'), 'utf8');
s = s.replace(/<path fill="#80BFDB" d="[^"]*"\/>/, '');
fs.writeFileSync(path.join(root, 'public/gezi_2.svg'), s);
console.log('Written public/gezi_2.svg (blue background removed)');
