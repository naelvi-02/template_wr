const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

const regex = /  \/\/ Send to backend API to prevent UI freezing[\s\S]*?const bgRemovedUrl = URL\.createObjectURL\(bgRemovedBlob\);/;

const replacement = `  // 1. DOWNSCALE FOR FAST AI PROCESSING
  const MAX_AI_DIM = 600;
  const originalImg = new Image();
  const rawUrl = URL.createObjectURL(asBlob);
  await new Promise((resolve, reject) => {
    originalImg.onload = resolve;
    originalImg.onerror = reject;
    originalImg.src = rawUrl;
  });

  const aiScale = Math.min(1, Math.min(MAX_AI_DIM / originalImg.width, MAX_AI_DIM / originalImg.height));
  const aiW = Math.floor(originalImg.width * aiScale);
  const aiH = Math.floor(originalImg.height * aiScale);

  const aiCanvas = document.createElement("canvas");
  aiCanvas.width = aiW;
  aiCanvas.height = aiH;
  const aiCtx = aiCanvas.getContext("2d");
  if (aiCtx) aiCtx.drawImage(originalImg, 0, 0, aiW, aiH);

  const aiBlob = await new Promise<Blob>((resolve, reject) => {
    aiCanvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });
  URL.revokeObjectURL(rawUrl);

  // 2. RUN AI LOCALLY ON THE SMALL IMAGE (Super fast, no freeze)
  const { removeBackground } = await import("@imgly/background-removal");
  const bgRemovedBlob = await removeBackground(aiBlob, {
    progress: () => {},
    model: "small" as any, // Bypass TS
  });
  const maskUrl = URL.createObjectURL(bgRemovedBlob);
  
  const maskImg = new Image();
  await new Promise((resolve, reject) => {
    maskImg.onload = resolve;
    maskImg.onerror = reject;
    maskImg.src = maskUrl;
  });
  URL.revokeObjectURL(maskUrl);

  // 3. APPLY MASK TO HIGH-RES ORIGINAL IMAGE
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = originalImg.width;
  finalCanvas.height = originalImg.height;
  const finalCtx = finalCanvas.getContext("2d", { willReadFrequently: true });
  if (!finalCtx) throw new Error("Could not get context");

  finalCtx.drawImage(maskImg, 0, 0, originalImg.width, originalImg.height);
  finalCtx.globalCompositeOperation = "source-in";
  finalCtx.drawImage(originalImg, 0, 0);
  finalCtx.globalCompositeOperation = "source-over";

  // Mock bgRemovedUrl so the rest of the file works!
  const bgRemovedUrl = await new Promise<string>((resolve) => {
    finalCanvas.toBlob((b) => resolve(URL.createObjectURL(b!)), "image/png");
  });`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/lib/imageProcessor.ts', code);
  console.log("Success replacing imageProcessor for alpha mask!");
} else {
  console.log("Regex not found");
}
