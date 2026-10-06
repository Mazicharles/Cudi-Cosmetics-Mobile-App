const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const output = path.join(__dirname, '..', 'assets');
fs.mkdirSync(output, { recursive: true });
// Path-based monogram: no system fonts required, identical on every machine.
function svg(size, background, scale = 1) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${background ? '<rect width="1024" height="1024" fill="#71384d"/>' : ''}<g transform="translate(512 512) scale(${scale}) translate(-512 -512)"><path d="M705 320 C650 258 590 232 510 232 C353 232 255 353 255 512 C255 674 358 792 510 792 C596 792 665 755 718 689 L667 636 C626 688 578 714 519 714 C411 714 346 631 346 512 C346 393 412 310 519 310 C578 310 620 335 658 378 Z" fill="white"/></g></svg>`,
  );
}
async function main() {
  for (const [name, size, bg, scale] of [
    ['icon', 1024, true, 1],
    ['adaptive-icon', 1024, false, 0.7],
    ['splash', 512, false, 1],
    ['favicon', 48, true, 1],
  ]) {
    await sharp(svg(size, bg, scale))
      .png()
      .toFile(path.join(output, `${name}.png`));
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
