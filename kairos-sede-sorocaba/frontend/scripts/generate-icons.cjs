const sharp = require('sharp');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
const OUTPUT = path.join(__dirname, '..', 'public', 'icons');

async function main() {
  const sizes = [192, 512];
  for (const size of sizes) {
    await sharp(INPUT)
      .resize(size, size)
      .png()
      .toFile(path.join(OUTPUT, `icon-${size}.png`));
    console.log(`✓ icon-${size}.png generated`);
  }
}

main().catch(console.error);
