import { createCanvas, loadImage } from 'canvas';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourcePath = join(__dirname, '..', 'public', 'icons', 'icon-512.png');
const outputDir = join(__dirname, '..', 'public', 'icons');

const sizes = [16, 48, 128];

async function resizeIcon() {
  try {
    console.log('Loading source image:', sourcePath);
    const image = await loadImage(sourcePath);
    
    for (const size of sizes) {
      console.log(`Generating icon-${size}.png...`);
      
      // Create canvas with target size
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      // Draw image scaled to fit canvas (maintains aspect ratio)
      ctx.drawImage(image, 0, 0, size, size);
      
      // Save as PNG
      const outputPath = join(outputDir, `icon-${size}.png`);
      const buffer = canvas.toBuffer('image/png');
      writeFileSync(outputPath, buffer);
      
      console.log(`✓ Created ${outputPath}`);
    }
    
    console.log('\n✓ All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

resizeIcon();

