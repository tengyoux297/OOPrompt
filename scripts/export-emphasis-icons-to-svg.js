/**
 * Export the Normal, Important, and Avoid emphasis icons as SVG files to a temp directory.
 * Run: node scripts/export-emphasis-icons-to-svg.js
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const SIZE = 48;

const SVGS = {
  important: `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" width="${SIZE}" height="${SIZE}">
  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
</svg>`,
  avoid: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="${SIZE}" height="${SIZE}">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
</svg>`,
  normal: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="${SIZE}" height="${SIZE}">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
</svg>`
};

// Optional: replace currentColor with a concrete color (or keep currentColor for use in HTML/CSS)
const COLORS = {
  normal: '#9ca3af',
  important: '#f59e0b',
  avoid: '#ef4444'
};

const outDir = path.join(os.tmpdir(), 'ooprompt-emphasis-icons');

function run() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const [name, svg] of Object.entries(SVGS)) {
    const colored = svg.replace('currentColor', COLORS[name]);
    const outPath = path.join(outDir, `${name}.svg`);
    fs.writeFileSync(outPath, colored, 'utf8');
    console.log('Written:', outPath);
  }

  console.log('Done. Temp dir:', outDir);
}

run();
