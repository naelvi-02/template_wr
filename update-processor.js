const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

const regex = /  const canvas = document\.createElement\("canvas"\);\s*canvas\.width = img\.width;[\s\S]*?let duplicateMode = false;/;

const replacement = `  // FULL RES CANVAS
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get context");

  ctx.filter = 'brightness(1.03) contrast(1.05) saturate(1.05)';
  ctx.drawImage(img, 0, 0);

  // DOWNSCALED CANVAS for fast pixel processing (max 800px)
  const MAX_DIM = 800;
  const scale = Math.min(1, Math.min(MAX_DIM / img.width, MAX_DIM / img.height));
  const downW = Math.floor(img.width * scale);
  const downH = Math.floor(img.height * scale);

  const lowCanvas = document.createElement("canvas");
  lowCanvas.width = downW;
  lowCanvas.height = downH;
  const lowCtx = lowCanvas.getContext("2d", { willReadFrequently: true });
  if (!lowCtx) throw new Error("Context");
  lowCtx.drawImage(canvas, 0, 0, downW, downH);

  const imgData = lowCtx.getImageData(0, 0, downW, downH);
  for (let i = 3; i < imgData.data.length; i += 4) {
    if (imgData.data[i] < 50) imgData.data[i] = 0;
  }
  
  const w = downW;
  const h = downH;
  const data = imgData.data;
  const compIdMap = new Int32Array(w * h);
  const components: {id: number, minX: number, maxX: number, minY: number, maxY: number, area: number}[] = [];
  const q = new Int32Array(w * h);
  let nextCompId = 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (compIdMap[idx] === 0 && data[idx * 4 + 3] > 0) {
        const currentId = nextCompId++;
        let head = 0;
        let tail = 0;
        q[tail++] = idx;
        compIdMap[idx] = currentId;
        
        let minX = x, maxX = x, minY = y, maxY = y;
        
        while (head < tail) {
          const curr = q[head++];
          const cy = Math.floor(curr / w);
          const cx = curr % w;
          
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;
          
          if (cy > 0) {
            const up = curr - w;
            if (compIdMap[up] === 0 && data[up * 4 + 3] > 0) { compIdMap[up] = currentId; q[tail++] = up; }
          }
          if (cy < h - 1) {
            const down = curr + w;
            if (compIdMap[down] === 0 && data[down * 4 + 3] > 0) { compIdMap[down] = currentId; q[tail++] = down; }
          }
          if (cx > 0) {
            const left = curr - 1;
            if (compIdMap[left] === 0 && data[left * 4 + 3] > 0) { compIdMap[left] = currentId; q[tail++] = left; }
          }
          if (cx < w - 1) {
            const right = curr + 1;
            if (compIdMap[right] === 0 && data[right * 4 + 3] > 0) { compIdMap[right] = currentId; q[tail++] = right; }
          }
        }
        
        const area = (maxX - minX + 1) * (maxY - minY + 1);
        components.push({ id: currentId, minX, maxX, minY, maxY, area });
      } else if (compIdMap[idx] === 0) {
        compIdMap[idx] = -1;
      }
    }
  }

  const validIds = new Set<number>();
  if (components.length > 0) {
    const maxArea = Math.max(...components.map(c => c.area));
    components.forEach(c => {
      const isAtBottom = c.minY > h * 0.65; 
      if (isAtBottom && c.area < maxArea * 0.4) return;
      if (c.area >= maxArea * 0.08) validIds.add(c.id);
    });
    
    for (let i = 0; i < w * h; i++) {
      const id = compIdMap[i];
      if (id > 0 && !validIds.has(id)) {
        data[i * 4 + 3] = 0;
      }
    }
  }

  lowCtx.putImageData(imgData, 0, 0);

  // Apply cleanup to high-res canvas by masking
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = img.width;
  maskCanvas.height = img.height;
  const maskCtx = maskCanvas.getContext("2d")!;
  // Draw the low-res alpha-cleared image scaled up as a mask
  maskCtx.drawImage(lowCanvas, 0, 0, img.width, img.height);
  
  // Use destination-in so only the opaque parts of the mask keep the original high-res pixels
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.globalCompositeOperation = "source-over";

  const boxes = getObjectsBoundingBoxes(lowCanvas).map(b => ({
    x: b.x / scale,
    y: b.y / scale,
    width: b.width / scale,
    height: b.height / scale,
    centerX: b.centerX / scale
  }));
  
  let finalBbox = { x: 0, y: 0, width: img.width, height: img.height };
  let duplicateMode = false;`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/lib/imageProcessor.ts', code);
  console.log("Success updating imageProcessor");
} else {
  console.log("Regex not found");
}
