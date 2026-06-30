const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

const regex = /ctx\.filter = 'brightness\(1\.03\) contrast\(1\.05\) saturate\(1\.05\)';\s*ctx\.drawImage\(img, 0, 0\);/;

const replacement = `ctx.filter = 'brightness(1.03) contrast(1.05) saturate(1.05)';
  ctx.drawImage(img, 0, 0);

  // SMART RECOVERY for aggressive cuts on white gold/silver
  try {
    const origUrlObj = URL.createObjectURL(asBlob);
    const origImgObj = new Image();
    origImgObj.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      origImgObj.onload = resolve;
      origImgObj.onerror = reject;
      origImgObj.src = origUrlObj;
    });

    const origCanvas = document.createElement("canvas");
    origCanvas.width = img.width;
    origCanvas.height = img.height;
    const origCtx = origCanvas.getContext("2d", { willReadFrequently: true });
    if (origCtx) {
      origCtx.drawImage(origImgObj, 0, 0);
      const origData = origCtx.getImageData(0, 0, img.width, img.height).data;
      
      const mainDataObj = ctx.getImageData(0, 0, img.width, img.height);
      const mainData = mainDataObj.data;

      // Only recover pixels that are somewhat dark (likely silver/metal, not pure white background)
      // and NOT completely black (which could be borders)
      for (let i = 0; i < mainData.length; i += 4) {
        if (mainData[i + 3] < 100) { // If AI removed it
          const r = origData[i];
          const g = origData[i+1];
          const b = origData[i+2];
          const avg = (r + g + b) / 3;
          // Threshold 230: recovers silver/metal.
          if (avg < 232 && avg > 10) {
            mainData[i] = r;
            mainData[i+1] = g;
            mainData[i+2] = b;
            mainData[i+3] = 255;
          }
        }
      }
      ctx.putImageData(mainDataObj, 0, 0);
    }
  } catch (e) {
    console.error("Smart recovery failed:", e);
  }`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/lib/imageProcessor.ts', code);
console.log("Smart Recovery injected.");
