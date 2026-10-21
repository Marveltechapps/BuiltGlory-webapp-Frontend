import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const src = process.argv[2];
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const nearWhite = (i) => data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245;

const seen = new Uint8Array(width * height);
const stack = [];
const push = (x, y) => {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const p = y * width + x;
  if (seen[p]) return;
  const i = p * channels;
  if (!nearWhite(i)) return;
  seen[p] = 1;
  data[i + 3] = 0;
  stack.push(p);
};
for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }
while (stack.length) {
  const p = stack.pop();
  const x = p % width;
  const y = (p - x) / width;
  push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
}

let minX = width, minY = height, maxX = 0, maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    if (data[i + 3] === 0) continue;
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    const luma = (data[i] + data[i + 1] + data[i + 2]) / 3;
    // Keep the coloured mark. Drop the pale drop-shadow, which is light and grey.
    if (max - min < 18 && luma > 200) continue;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
}
const side = Math.max(maxX - minX + 1, maxY - minY + 1);
const left = Math.max(0, minX - Math.floor((side - (maxX - minX + 1)) / 2));
const top = Math.max(0, minY - Math.floor((side - (maxY - minY + 1)) / 2));
const cropW = Math.min(side, width - left);
const cropH = Math.min(side, height - top);

const master = await sharp(data, { raw: { width, height, channels } })
  .extract({ left, top, width: cropW, height: cropH })
  .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const out = async (file, size) => {
  writeFileSync(file, await sharp(master).resize(size, size).png().toBuffer());
};

const root = process.argv[3];
const android = `${root}/BG-Customer app/android/app/src/main/res`;
const ios = `${root}/BG-Customer app/ios/BuiltGlory/Images.xcassets/AppIcon.appiconset`;
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [d, s] of Object.entries(sizes)) {
  await out(`${android}/mipmap-${d}/ic_launcher.png`, s);
  await out(`${android}/mipmap-${d}/ic_launcher_round.png`, s);
}
const iosFiles = [
  ['Icon-20@2x.png', 40], ['Icon-20@3x.png', 60],
  ['Icon-29@2x.png', 58], ['Icon-29@3x.png', 87],
  ['Icon-40@2x.png', 80], ['Icon-40@3x.png', 120],
  ['Icon-60@2x.png', 120], ['Icon-60@3x.png', 180],
  ['Icon-1024.png', 1024],
];
for (const [name, size] of iosFiles) await out(`${ios}/${name}`, size);
await out(`${root}/BG-Customer app/src/assets/logo.png`, 512);
await out(`${root}/BG-Webapp/public/logo.png`, 512);
await out(`${root}/BG-Webapp/src/app/icon.png`, 512);
await out(`${root}/BG-Webapp/src/app/apple-icon.png`, 180);
console.log(`cropped ${cropW}x${cropH} at ${left},${top} from ${width}x${height}`);
