// One-off: render the source SVG into the PNG icon sizes a PWA needs.
// Run with: node scripts/generate-icons.mjs  (requires `sharp` devDependency)
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const iconsDir = path.join(publicDir, 'icons');
const src = path.join(publicDir, 'icon.svg');

await mkdir(iconsDir, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

for (const t of targets) {
  await sharp(src).resize(t.size, t.size).png().toFile(path.join(iconsDir, t.file));
  console.log('wrote', t.file);
}

// Maskable variant: same art on a solid background with safe padding.
const padded = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
     <rect width="512" height="512" fill="#2e7d44"/>
   </svg>`,
);
await sharp(padded)
  .composite([{ input: await sharp(src).resize(360, 360).png().toBuffer(), gravity: 'center' }])
  .png()
  .toFile(path.join(iconsDir, 'maskable-512.png'));
console.log('wrote maskable-512.png');
