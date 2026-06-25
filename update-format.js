const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

const regex = /  const formData = new FormData\(\);\s*formData\.append\("image", asBlob\);/;

const replacement = `  // Convert any image format to standard PNG using an offscreen canvas
  // This ensures the Node.js backend can process it without "unsupported format" errors
  const imgForConv = new Image();
  const bmpUrl = URL.createObjectURL(asBlob);
  await new Promise((resolve, reject) => {
    imgForConv.onload = resolve;
    imgForConv.onerror = reject;
    imgForConv.src = bmpUrl;
  });
  const convCanvas = document.createElement("canvas");
  convCanvas.width = imgForConv.width;
  convCanvas.height = imgForConv.height;
  const convCtx = convCanvas.getContext("2d");
  if (convCtx) convCtx.drawImage(imgForConv, 0, 0);
  
  const standardBlob = await new Promise<Blob>((resolve, reject) => {
    convCanvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });
  URL.revokeObjectURL(bmpUrl);

  const formData = new FormData();
  formData.append("image", standardBlob);`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/lib/imageProcessor.ts', code);
  console.log("Success replacing blob format");
} else {
  console.log("Regex not found");
}
