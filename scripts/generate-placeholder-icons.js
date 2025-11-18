// Simple script to generate placeholder icons for Chrome extension
// Uses Node.js built-in modules and a simple PNG generation approach

import fs from 'fs';
import { createCanvas } from 'canvas';

const sizes = [16, 48, 128];
const iconDir = './public/icons';

// Ensure directory exists
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Create placeholder icons
sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Draw background (blue gradient)
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#3B82F6'); // Blue-500
  gradient.addColorStop(1, '#1E40AF'); // Blue-700
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Draw "OO" text (OOPrompt)
  ctx.fillStyle = 'white';
  ctx.font = `bold ${Math.floor(size * 0.4)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OO', size / 2, size / 2);
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`${iconDir}/icon-${size}.png`, buffer);
  console.log(`Created icon-${size}.png`);
});

console.log('All placeholder icons created successfully!');

