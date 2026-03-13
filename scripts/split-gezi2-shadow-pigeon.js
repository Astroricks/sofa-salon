const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = path.join(root, 'public/gezi_2.svg');
let s = fs.readFileSync(src, 'utf8');

// Extract first path with fill #408092 (the ground shadow blob)
const shadowPathMatch = s.match(/<path fill="#408092" d="([^"]*)"\/>/);
if (!shadowPathMatch) {
  console.error('Could not find shadow path (fill="#408092") in gezi_2.svg');
  process.exit(1);
}
const shadowPath = '<path fill="#408092" d="' + shadowPathMatch[1] + '"/>';

// Shadow SVG: same viewBox, only the shadow path
const openTag = s.match(/^<svg[^>]*>/)[0];
const shadowSvg = openTag + shadowPath + '</svg>';
fs.writeFileSync(path.join(root, 'public/gezi_2_shadow.svg'), shadowSvg);

// Pigeon SVG: remove that first path so pigeon has no shadow (shadow rendered separately)
const pigeonSvg = s.replace(/<path fill="#408092" d="[^"]*"\/>/, '');
fs.writeFileSync(path.join(root, 'public/gezi_2_pigeon.svg'), pigeonSvg);

console.log('Written public/gezi_2_shadow.svg and public/gezi_2_pigeon.svg');
