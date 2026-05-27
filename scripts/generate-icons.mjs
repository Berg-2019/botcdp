import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'frontend', 'public');

const svg = (size) => {
  const rx = size * 0.18;
  const bx = size * 0.2, by = size * 0.2;
  const bw = size * 0.6, bh = size * 0.46;
  const br = size * 0.08;
  const tailX1 = size * 0.28, tailX2 = size * 0.2, tailX3 = size * 0.36;
  const tailY = size * 0.66, tailTip = size * 0.74;
  const dotY = size * 0.43, dotR = size * 0.045;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${rx}" fill="#3b82f6"/>
  <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${br}" fill="white"/>
  <polygon points="${tailX1},${tailY} ${tailX2},${tailTip} ${tailX3},${tailY}" fill="white"/>
  <circle cx="${size * 0.36}" cy="${dotY}" r="${dotR}" fill="#1d4ed8"/>
  <circle cx="${size * 0.5}"  cy="${dotY}" r="${dotR}" fill="#1d4ed8"/>
  <circle cx="${size * 0.64}" cy="${dotY}" r="${dotR}" fill="#1d4ed8"/>
</svg>`;
};

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg(size)))
    .png()
    .toFile(path.join(publicDir, `icon-${size}.png`));
  console.log(`Gerado: icon-${size}.png`);
}
