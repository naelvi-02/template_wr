const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

const newFunc = `
export function getFastBoundingBox(img: HTMLImageElement | HTMLCanvasElement) {
  const canvas = document.createElement("canvas");
  const MAX_DIM = 400;
  const scale = Math.min(1, Math.min(MAX_DIM / img.width, MAX_DIM / img.height));
  canvas.width = Math.floor(img.width * scale);
  canvas.height = Math.floor(img.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { x: 0, y: 0, width: img.width, height: img.height, centerX: img.width / 2 };
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
  
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      
      // Treat very light grey/white as background (> 230 average RGB)
      if ((r + g + b) / 3 < 235) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  if (minX > maxX) {
    return { x: 0, y: 0, width: img.width, height: img.height, centerX: img.width / 2 };
  }
  
  return {
    x: minX / scale,
    y: minY / scale,
    width: (maxX - minX) / scale,
    height: (maxY - minY) / scale,
    centerX: (minX + (maxX - minX) / 2) / scale
  };
}
`;

code = code + newFunc;
fs.writeFileSync('src/lib/imageProcessor.ts', code);
console.log("Success adding getFastBoundingBox");
