const sharp = require('sharp');
const path = require('path');

async function manualCrop() {
  const inputPath = path.join(__dirname, 'logo.jpeg');
  const outputPath = path.join(__dirname, 'public', 'icon.png');

  const metadata = await sharp(inputPath).metadata();
  const W = metadata.width;
  const H = metadata.height;

  // Expanded bounding box:
  // - leftPct lowered to 0.10 to capture full left leaf tip
  // - widthPct increased to 0.28 to prevent right rhizome cutoff
  // - heightPct covering top leaf to bottom arc curve
  const cropLeft   = Math.round(W * 0.10);
  const cropTop    = Math.round(H * 0.12);
  const cropWidth  = Math.round(W * 0.28);
  const cropHeight = Math.round(H * 0.74);

  // Exact background tone sampled from the logo: #F5F4EE
  const bg = { r: 245, g: 244, b: 238, alpha: 1 };

  const croppedEmblem = await sharp(inputPath)
    .extract({
      left: cropLeft,
      top: cropTop,
      width: cropWidth,
      height: cropHeight,
    })
    .toBuffer();

  // Scale and center squarely inside a 512x512 frame
  await sharp(croppedEmblem)
    .resize(440, 440, {
      fit: 'contain',
      background: bg,
    })
    .extend({
      top: 36,
      bottom: 36,
      left: 36,
      right: 36,
      background: bg,
    })
    .resize(512, 512)
    .png()
    .toFile(outputPath);

  console.log('✅ Generated centered icon with full right lobe restored at public/icon.png');
}

manualCrop().catch(console.error);