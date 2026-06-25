const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

// We are replacing the backend fetch with the local removeBackground, 
// BUT we will downscale the image BEFORE sending it to the AI to prevent UI freezing!

const regex = /  \/\/ Send to backend API to prevent UI freezing[\s\S]*?const bgRemovedUrl = URL\.createObjectURL\(bgRemovedBlob\);/;

const replacement = `  // 1. DOWNSCALE IMAGE BEFORE AI (To prevent freezing)
  const MAX_AI_DIM = 600; // Small size for fast AI processing
  const imgForConv = new Image();
  const bmpUrl = URL.createObjectURL(asBlob);
  await new Promise((resolve, reject) => {
    imgForConv.onload = resolve;
    imgForConv.onerror = reject;
    imgForConv.src = bmpUrl;
  });

  const aiScale = Math.min(1, Math.min(MAX_AI_DIM / imgForConv.width, MAX_AI_DIM / imgForConv.height));
  const aiW = Math.floor(imgForConv.width * aiScale);
  const aiH = Math.floor(imgForConv.height * aiScale);

  const aiCanvas = document.createElement("canvas");
  aiCanvas.width = aiW;
  aiCanvas.height = aiH;
  const aiCtx = aiCanvas.getContext("2d")!;
  aiCtx.drawImage(imgForConv, 0, 0, aiW, aiH);

  const aiBlob = await new Promise<Blob>((resolve, reject) => {
    aiCanvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });
  URL.revokeObjectURL(bmpUrl);

  // 2. PROCESS LOCALLY WITH DOWNSCALED IMAGE
  const { removeBackground } = await import("@imgly/background-removal");
  const bgRemovedBlob = await removeBackground(aiBlob, {
    progress: () => {},
    model: "small", // Use small model for speed since we only need the mask
  });
  const bgRemovedUrl = URL.createObjectURL(bgRemovedBlob);`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/lib/imageProcessor.ts', code);
  console.log("Success replacing backend API with local downscaled AI");
} else {
  console.log("Regex not found");
}
