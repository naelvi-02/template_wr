const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

const regex = /preCtx\.drawImage\(origImg, 0, 0\);\s*\/\/ Custom non-linear curve to DARKEN silver\/white-gold \(e\.g\. RGB 210\)\s*\/\/ while keeping pure white paper \(RGB 245-255\) relatively bright\.\s*\/\/ This drastically helps the AI find the edges of white metal on white backgrounds\.\s*const preImgData = preCtx\.getImageData\(0, 0, preCanvas\.width, preCanvas\.height\);\s*const d = preImgData\.data;\s*for \(let i = 0; i < d\.length; i \+= 4\) \{\s*for \(let c = 0; c < 3; c\+\+\) \{\s*let norm = d\[i\+c\] \/ 255;\s*\/\/ Power curve: Math\.pow\(norm, 4\)\s*\/\/ 255 -> 255\s*\/\/ 245 -> 216\s*\/\/ 210 -> 116 \(Silver ring becomes very dark!\)\s*\/\/ 180 -> 63\s*d\[i\+c\] = Math\.pow\(norm, 4\) \* 255;\s*\}\s*\}\s*preCtx\.putImageData\(preImgData, 0, 0\);/;

const replacement = `preCtx.drawImage(origImg, 0, 0);
  
  if (category === "Ring" || category === "Bracelet" || category === "Pendant" || category === "Brooch") {
    // Custom non-linear curve to DARKEN silver/white-gold (e.g. RGB 210) 
    // while keeping pure white paper (RGB 245-255) relatively bright.
    // This drastically helps the AI find the edges of white metal on white backgrounds.
    const preImgData = preCtx.getImageData(0, 0, preCanvas.width, preCanvas.height);
    const d = preImgData.data;
    for (let i = 0; i < d.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let norm = d[i+c] / 255;
        d[i+c] = Math.pow(norm, 4) * 255;
      }
    }
    preCtx.putImageData(preImgData, 0, 0);
  }`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/lib/imageProcessor.ts', code);
  console.log("Success: Conditional pre-processing added!");
} else {
  console.log("Regex failed to match. File not changed.");
}
