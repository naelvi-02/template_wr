const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

const regex = /export async function loadAndProcessImage\(asBlob: Blob, category: string \| null = null\): Promise<\{ canvas:\s*HTMLCanvasElement, bbox: any, originalWidth: number, originalHeight: number \}> \{\s*const \{ removeBackground \} = await import\("@imgly\/background-removal"\);\s*const bgRemovedBlob = await removeBackground\(asBlob, \{\s*progress: \(\) => \{\},\s*model: "isnet"\s*\}\);/;

const replacement = `export async function loadAndProcessImage(asBlob: Blob, category: string | null = null): Promise<{ canvas: HTMLCanvasElement, bbox: any, originalWidth: number, originalHeight: number }> {
  const { removeBackground } = await import("@imgly/background-removal");
  
  // 1. Pre-process image for AI (Boost contrast so AI can see white-gold on white-paper better)
  const origUrl = URL.createObjectURL(asBlob);
  const origImg = new Image();
  origImg.crossOrigin = "anonymous";
  await new Promise((resolve, reject) => {
    origImg.onload = resolve;
    origImg.onerror = reject;
    origImg.src = origUrl;
  });

  const preCanvas = document.createElement("canvas");
  preCanvas.width = origImg.width;
  preCanvas.height = origImg.height;
  const preCtx = preCanvas.getContext("2d");
  if (!preCtx) throw new Error("No context");
  
  // Darken slightly and boost contrast heavily
  preCtx.filter = 'contrast(200%) brightness(85%) saturate(150%)';
  preCtx.drawImage(origImg, 0, 0);
  
  const preBlob = await new Promise<Blob>((resolve) => preCanvas.toBlob(b => resolve(b!), 'image/jpeg', 0.9));

  // 2. Run AI on the pre-processed image
  const bgRemovedBlob = await removeBackground(preBlob, {
    progress: () => {},
    model: "isnet"
  });`;

code = code.replace(regex, replacement);

const regex2 = /const canvas = document\.createElement\("canvas"\);\s*canvas\.width = img\.width;\s*canvas\.height = img\.height;\s*const ctx = canvas\.getContext\("2d", \{ willReadFrequently: true \}\);\s*if \(!ctx\) throw new Error\("Could not get context"\);\s*ctx\.filter = 'brightness\(1\.03\) contrast\(1\.05\) saturate\(1\.05\)';\s*ctx\.drawImage\(img, 0, 0\);/;

const replacement2 = `const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get context");

  // Draw the ORIGINAL image, but apply the ALPHA channel from the AI's result
  ctx.drawImage(origImg, 0, 0); // Original colors
  
  // Apply mask using destination-in
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(img, 0, 0); // img here is the AI result (which has the correct alpha mask)
  ctx.globalCompositeOperation = 'source-over';
  
  // Apply the slight enhancement to the final masked result
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = img.width;
  finalCanvas.height = img.height;
  const finalCtx = finalCanvas.getContext("2d", { willReadFrequently: true });
  if (!finalCtx) throw new Error("No context");
  finalCtx.filter = 'brightness(1.03) contrast(1.05) saturate(1.05)';
  finalCtx.drawImage(canvas, 0, 0);
  
  // Swap ctx variables so the rest of the code works with finalCanvas
  const oldCtx = ctx;
  const oldCanvas = canvas;
  const actualCanvas = finalCanvas;
  const actualCtx = finalCtx;
  `;

// Wait, the rest of the code uses `canvas` and `ctx`. I need to make sure they point to `actualCanvas` and `actualCtx`.
// Better yet, just apply filter, draw origImg, then destination-in img.
// Wait! If I apply filter to ctx BEFORE drawing origImg, it enhances origImg!
const replacement2Better = `const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get context");

  // 1. Apply enhancement filter
  ctx.filter = 'brightness(1.03) contrast(1.05) saturate(1.05)';
  
  // 2. Draw ORIGINAL image (so we get original colors)
  ctx.drawImage(origImg, 0, 0);
  
  // 3. Reset filter and apply AI's alpha mask
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'source-over';`;

code = code.replace(regex2, replacement2Better);

fs.writeFileSync('src/lib/imageProcessor.ts', code);
console.log("Pre-processing mask algorithm injected.");
