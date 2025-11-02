/**
 * Create PWA Icons using Node.js (alternative method)
 * Requires: npm install sharp
 * Run: node scripts/create-icons-node.js
 */

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#0ea5e9');
  gradient.addColorStop(1, '#0369a1');

  // Draw rounded rectangle
  const radius = size * 0.2;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();

  // Draw text
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.4}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LOS', size / 2, size / 2);

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  const filepath = join(__dirname, '..', 'public', filename);
  writeFileSync(filepath, buffer);
  console.log(`✅ Created ${filename} (${size}x${size})`);
}

try {
  createIcon(192, 'icon-192.png');
  createIcon(512, 'icon-512.png');
  console.log('\n✅ All icons created successfully!');
} catch (error) {
  console.error('❌ Error creating icons. Make sure to install: npm install canvas');
  console.error(error.message);
}

