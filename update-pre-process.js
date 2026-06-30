const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

const regex = /preCtx\.filter = 'contrast\(200%\) brightness\(85%\) saturate\(150%\)';\s*preCtx\.drawImage\(origImg, 0, 0\);/;

const replacement = `preCtx.drawImage(origImg, 0, 0);
  
  // Custom non-linear curve to DARKEN silver/white-gold (e.g. RGB 210) 
  // while keeping pure white paper (RGB 245-255) relatively bright.
  // This drastically helps the AI find the edges of white metal on white backgrounds.
  const preImgData = preCtx.getImageData(0, 0, preCanvas.width, preCanvas.height);
  const d = preImgData.data;
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let norm = d[i+c] / 255;
      // Power curve: Math.pow(norm, 4)
      // 255 -> 255
      // 245 -> 216
      // 210 -> 116 (Silver ring becomes very dark!)
      // 180 -> 63
      d[i+c] = Math.pow(norm, 4) * 255;
    }
  }
  preCtx.putImageData(preImgData, 0, 0);`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/lib/imageProcessor.ts', code);
console.log("Custom curve pre-processing injected.");
