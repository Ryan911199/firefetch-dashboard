/**
 * PWA Icon Generator Script
 *
 * This script generates PWA icons from an SVG template.
 * Run with: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// SVG icon template - FireFetch branding with activity/pulse icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#0a0a0b"/>
  <rect x="56" y="56" width="400" height="400" rx="80" fill="#18181b"/>
  <g transform="translate(128, 128)">
    <circle cx="128" cy="128" r="100" fill="#3b82f6" opacity="0.2"/>
    <path d="M128 60 L128 196" stroke="#3b82f6" stroke-width="16" stroke-linecap="round"/>
    <path d="M60 128 L196 128" stroke="#3b82f6" stroke-width="16" stroke-linecap="round"/>
    <path d="M80 80 L176 176" stroke="#3b82f6" stroke-width="12" stroke-linecap="round" opacity="0.5"/>
    <path d="M176 80 L80 176" stroke="#3b82f6" stroke-width="12" stroke-linecap="round" opacity="0.5"/>
    <circle cx="128" cy="128" r="24" fill="#3b82f6"/>
    <circle cx="128" cy="128" r="8" fill="#fff"/>
  </g>
</svg>`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Write the base SVG
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);
console.log('Created: icon.svg');

// Generate PNG icons using sharp
async function generatePNGs() {
  try {
    const sharp = require('sharp');

    for (const size of sizes) {
      const filename = 'icon-' + size + 'x' + size + '.png';
      await sharp(Buffer.from(svgIcon))
        .resize(size, size)
        .png()
        .toFile(path.join(iconsDir, filename));
      console.log('Created: ' + filename);
    }

    // Create favicon
    await sharp(Buffer.from(svgIcon))
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'));
    console.log('Created: favicon.png');

    // Create favicon.ico (actually a 32x32 PNG, browsers handle this)
    await sharp(Buffer.from(svgIcon))
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, '../public/favicon.ico'));
    console.log('Created: favicon.ico');

    console.log('\nAll icons generated successfully!');
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('\nTo generate PNG icons, install sharp:');
      console.log('  npm install sharp --save-dev');
      console.log('  node scripts/generate-icons.js');
    } else {
      throw err;
    }
  }
}

generatePNGs();
