const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

const prefix = code.substring(0, code.indexOf('export async function loadAndProcessImage'));

const newBody = `export async function loadAndProcessImage(asBlob: Blob, category: string | null = null): Promise<{ canvas: HTMLCanvasElement, bbox: any, originalWidth: number, originalHeight: number }> {
  // 1. DOWNSCALE FOR FAST AI PROCESSING
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
    model: "small" as any, // Cast to any to bypass TS error
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
  finalCtx.filter = 'brightness(1.03) contrast(1.05) saturate(1.05)';
  finalCtx.drawImage(originalImg, 0, 0);
  finalCtx.globalCompositeOperation = "source-over";

  // Mock bgRemovedUrl so the rest of the original function code works perfectly!
  const bgRemovedUrl = await new Promise<string>((resolve) => {
    finalCanvas.toBlob((b) => resolve(URL.createObjectURL(b!)), "image/png");
  });
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = bgRemovedUrl;
  });

  // FULL RES CANVAS (Now already processed)
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get context");
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

  // Pixel analysis on low res...
  const imgData = lowCtx.getImageData(0, 0, lowCanvas.width, lowCanvas.height);
  for (let i = 3; i < imgData.data.length; i += 4) {
    if (imgData.data[i] < 50) {
      imgData.data[i] = 0;
    }
  }
  
  const w = lowCanvas.width;
  const h = lowCanvas.height;
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

  // Apply cleanup to high res
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(lowCanvas, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";

  const boxes = getObjectsBoundingBoxes(lowCanvas).map(b => ({
    x: b.x / scale,
    y: b.y / scale,
    width: b.width / scale,
    height: b.height / scale,
    centerX: b.centerX / scale
  }));
  
  let finalBbox = { x: 0, y: 0, width: canvas.width, height: canvas.height };
  let duplicateMode = false;

  if (boxes.length > 0) {
    const imgCenterX = img.width / 2;
    
    if (category === "Earrings") {
      let bestBox = boxes[0];
      let minDiff = Math.abs(boxes[0].centerX - imgCenterX);
      for (let i = 1; i < boxes.length; i++) {
        const diff = Math.abs(boxes[i].centerX - imgCenterX);
        if (diff < minDiff) {
          minDiff = diff;
          bestBox = boxes[i];
        }
      }
      finalBbox = bestBox;
      
      const aspectRatio = finalBbox.width / finalBbox.height;
      if (aspectRatio < 1.2) {
        duplicateMode = true;
      }
    } else {
      let bestBox = boxes[0];
      let minDiff = Math.abs(boxes[0].centerX - imgCenterX);
      for (let i = 1; i < boxes.length; i++) {
        const diff = Math.abs(boxes[i].centerX - imgCenterX);
        if (diff < minDiff) {
          minDiff = diff;
          bestBox = boxes[i];
        }
      }
      finalBbox = bestBox;
    }

    const paddingX = finalBbox.width * 0.05;
    const paddingY = finalBbox.height * 0.05;

    finalBbox.x = Math.max(0, finalBbox.x - paddingX);
    finalBbox.y = Math.max(0, finalBbox.y - paddingY);
    finalBbox.width = Math.min(canvas.width - finalBbox.x, finalBbox.width + paddingX * 2);
    finalBbox.height = Math.min(canvas.height - finalBbox.y, finalBbox.height + paddingY * 2);

    if (category === "Earrings" && duplicateMode) {
      const centerX = finalBbox.x + (finalBbox.width / 2);
      finalBbox.width = finalBbox.width * 2.2;
      finalBbox.x = Math.max(0, centerX - (finalBbox.width / 2));
    }
  }

  return { canvas, bbox: finalBbox, originalWidth: img.width, originalHeight: img.height };
}
`;

fs.writeFileSync('src/lib/imageProcessor.ts', prefix + newBody);
console.log("Success replacing imageProcessor completely!");
