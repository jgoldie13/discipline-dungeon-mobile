const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const publicDir = path.join(__dirname, '../public');

// Simple SVG icon
const svgIcon = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6d28d9;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="80" fill="url(#grad)"/>
  <text x="256" y="340" font-family="Arial, sans-serif" font-size="280" font-weight="bold" text-anchor="middle" fill="white">D</text>
</svg>
`;

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = path.join(publicDir, `icon-${size}.png`);
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated ${outputPath}`);
  }
  console.log('Icons generated successfully!');
}

generateIcons().catch(console.error);
