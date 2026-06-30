const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

const regex = /const preImgData = preCtx\.getImageData\(0, 0, preCanvas\.width, preCanvas\.height\);\s*const d = preImgData\.data;\s*for \(let i = 0; i < d\.length; i \+= 4\) \{\s*for \(let c = 0; c < 3; c\+\+\) \{\s*let norm = d\[i\+c\] \/ 255;\s*d\[i\+c\] = Math\.pow\(norm, 4\) \* 255;\s*\}\s*\}\s*preCtx\.putImageData\(preImgData, 0, 0\);/;

const replacement = `if (category === "Ring" || category === "Bracelet" || category === "Pendant" || category === "Brooch") {
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

code = code.replace(regex, replacement);
fs.writeFileSync('src/lib/imageProcessor.ts', code);
console.log("Conditional pre-processing injected.");
