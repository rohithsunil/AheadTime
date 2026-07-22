import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const srcImage = 'App Icon - Ahead Time.png';
const publicDir = 'public';
const iconsDir = join(publicDir, 'icons');

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

const sizes = [
  { path: join(publicDir, 'favicon.png'), size: 32 },
  { path: join(publicDir, 'apple-touch-icon.png'), size: 180 },
  { path: join(iconsDir, 'icon-72.png'), size: 72 },
  { path: join(iconsDir, 'icon-96.png'), size: 96 },
  { path: join(iconsDir, 'icon-128.png'), size: 128 },
  { path: join(iconsDir, 'icon-144.png'), size: 144 },
  { path: join(iconsDir, 'icon-152.png'), size: 152 },
  { path: join(iconsDir, 'icon-192.png'), size: 192 },
  { path: join(iconsDir, 'icon-384.png'), size: 384 },
  { path: join(iconsDir, 'icon-512.png'), size: 512 },
  { path: join(iconsDir, 'maskable-icon-512.png'), size: 512 },
];

async function generate() {
  console.log(`Processing ${srcImage}...`);
  for (const item of sizes) {
    await sharp(srcImage)
      .resize(item.size, item.size, { fit: 'cover' })
      .toFile(item.path);
    console.log(`Generated ${item.path} (${item.size}x${item.size})`);
  }
  
  // Also create favicon.ico from 32x32 PNG
  await sharp(srcImage)
    .resize(32, 32)
    .toFormat('png')
    .toFile(join(publicDir, 'favicon.ico'));
  console.log('Generated favicon.ico');
}

generate().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
