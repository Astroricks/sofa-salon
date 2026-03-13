const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'public/gezi_1.svg');
let s = fs.readFileSync(srcPath, 'utf8');

// Remove the entire first <g fill="#FFF"> group (two paths: the big white blob above the pigeon head and the small one).
// That group is pure background; the pigeon is drawn by later groups (BFBFFF, FFFFBF, gray, #404040, etc.).
const whiteGroupRe = /<g fill="#FFF" stroke-width="0"><path d="[^"]*"\/><path d="[^"]*"\/><\/g>/;
if (whiteGroupRe.test(s)) {
  s = s.replace(whiteGroupRe, '');
  console.log('Removed first <g fill="#FFF"> (white background above pigeon).');
} else {
  console.log('No matching <g fill="#FFF"> found (already removed or format changed).');
}

fs.writeFileSync(srcPath, s);
console.log('Written public/gezi_1.svg');
