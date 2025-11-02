/**
 * Generate PWA Icons
 * Creates 192x192 and 512x512 PNG icons for the LOS application
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// SVG template for the icon
const iconSVG = (size, isLarge = false) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0ea5e9;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0369a1;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text x="50%" y="50%" 
        font-family="Inter, system-ui, sans-serif" 
        font-weight="bold" 
        font-size="${isLarge ? size * 0.35 : size * 0.4}" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle"
        letter-spacing="${isLarge ? '-4' : '-2'}">
    LOS
  </text>
  ${isLarge ? `
  <text x="50%" y="60%" 
        font-family="Inter, system-ui, sans-serif" 
        font-size="${size * 0.08}" 
        fill="rgba(255,255,255,0.9)" 
        text-anchor="middle" 
        dominant-baseline="middle">
    Loan Origination
  </text>
  ` : ''}
</svg>
`;

// Convert SVG to PNG using a simple approach
// Note: This is a basic implementation. In production, use a library like 'sharp' or 'puppeteer'
async function generateIcon(size, filename, isLarge = false) {
  const svg = iconSVG(size, isLarge);
  const svgPath = join(__dirname, '..', 'public', filename.replace('.png', '.svg'));
  const pngPath = join(__dirname, '..', 'public', filename);
  
  // Write SVG first
  writeFileSync(svgPath, svg.trim());
  
  console.log(`✅ Generated ${filename} (${size}x${size})`);
  console.log(`   SVG: ${svgPath}`);
  console.log(`   Note: Convert ${svgPath} to PNG manually or use ImageMagick/Inkscape`);
  console.log(`   Command: convert ${svgPath} -background none ${pngPath}`);
  console.log(`   Or: inkscape ${svgPath} --export-filename=${pngPath} --export-width=${size} --export-height=${size}`);
}

// Generate icons
async function main() {
  console.log('🎨 Generating PWA Icons...\n');
  
  await generateIcon(192, 'icon-192.png', false);
  console.log('');
  await generateIcon(512, 'icon-512.png', true);
  
  console.log('\n✅ Icon generation complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Install ImageMagick: brew install imagemagick');
  console.log('   2. Run: cd web/public && convert icon-192.svg -background none icon-192.png');
  console.log('   3. Run: convert icon-512.svg -background none icon-512.png');
  console.log('\n   OR use Inkscape:');
  console.log('   1. Install Inkscape: brew install inkscape');
  console.log('   2. Run the conversion commands shown above');
  console.log('\n   OR use online converter:');
  console.log('   Upload the SVG files to https://cloudconvert.com/svg-to-png');
}

main().catch(console.error);

