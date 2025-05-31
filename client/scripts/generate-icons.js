const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourceIcon = path.join(__dirname, '../public/icons/android-chrome-512x512.png');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate icons for each size
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      await sharp(sourceIcon)
        .resize(size, size)
        .toFile(outputPath);
      console.log(`Generated ${outputPath}`);
    }

    // Copy the 192x192 icon as apple-touch-icon
    await sharp(sourceIcon)
      .resize(192, 192)
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));
    console.log('Generated apple-touch-icon.png');

    // Copy the 192x192 icon as favicon
    await sharp(sourceIcon)
      .resize(192, 192)
      .toFile(path.join(outputDir, 'favicon.ico'));
    console.log('Generated favicon.ico');

    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons(); 