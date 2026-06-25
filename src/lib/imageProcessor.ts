export function parseFilename(filename: string) {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  const tokens = nameWithoutExt.split(" ");
  
  let isDetail = false;
  if (tokens[tokens.length - 1] === "2") {
    isDetail = true;
    tokens.pop();
  }
  
  const baseName = tokens.join(" ");
  
  let karat = "16K"; // default fallback
  let mp = "16"; // default fallback
  let category = null;
  
  if (tokens.length > 0) {
    const fullText = nameWithoutExt.toUpperCase();
    if (fullText.includes("KL") || fullText.includes("KALUNG") || fullText.includes("NECKLACE")) category = "Necklace";
    else if (fullText.includes("GL") || fullText.includes("GELANG") || fullText.includes("BRACELET")) category = "Bracelet";
    else if (fullText.includes("CC") || fullText.includes("CINCIN") || fullText.includes("RING")) category = "Ring";
    else if (fullText.includes("AT") || fullText.includes("ANTING") || fullText.includes("ANT") || fullText.includes("EARRINGS")) category = "Earrings";
    else if (fullText.includes("LT") || fullText.includes("LIONTIN") || fullText.includes("PENDANT")) category = "Pendant";
    else if (fullText.includes("BR") || fullText.includes("BROS") || fullText.includes("BROOCH")) category = "Brooch";
  }
  
  for (let i = 0; i < tokens.length; i++) {
    if (/^\d{1,2}K[A-Z]*$/i.test(tokens[i])) {
      karat = tokens[i].toUpperCase();
      if (i + 1 < tokens.length) {
        const remainingStr = tokens.slice(i + 1).join(" ");
        const numberMatch = remainingStr.match(/\d+/);
        if (numberMatch) {
          mp = numberMatch[0];
        } else {
          mp = tokens[i + 1];
        }
      }
      break;
    }
  }
  
  return { baseName, karat, mp, category, isDetail };
}

export function getObjectsBoundingBoxes(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const w = canvas.width, h = canvas.height;

  // 1. Column projection with noise filtering
  const cols = new Array(w).fill(false);
  const minPixelsPerCol = Math.max(10, Math.floor(h * 0.015)); // e.g., 15px for 1000px height
  
  for (let x = 0; x < w; x++) {
    let solidCount = 0;
    let hasOpaque = false;
    for (let y = 0; y < h; y++) {
      const alpha = data.data[(y * w + x) * 4 + 3];
      if (alpha > 200) hasOpaque = true;
      if (alpha > 40) solidCount++;
    }
    if (hasOpaque || solidCount > minPixelsPerCol) {
      cols[x] = true;
    }
  }

  // 2. Group columns into segments with a gap threshold
  const GAP_THRESHOLD = Math.max(20, Math.floor(w * 0.05));
  const segments: { start: number, end: number }[] = [];
  let currentStart = -1;
  let lastFilled = -1;

  for (let x = 0; x < w; x++) {
    if (cols[x]) {
      if (currentStart === -1) {
        currentStart = x;
      } else if (lastFilled !== -1 && (x - lastFilled) > GAP_THRESHOLD) {
        segments.push({ start: currentStart, end: lastFilled });
        currentStart = x;
      }
      lastFilled = x;
    }
  }
  if (currentStart !== -1 && lastFilled !== -1) {
    segments.push({ start: currentStart, end: lastFilled });
  }

  // 3. Find Y bounds for each segment
  const boxes = segments.map(seg => {
    let top = -1, bottom = -1;
    for (let y = 0; y < h; y++) {
      let hasPixel = false;
      for (let x = seg.start; x <= seg.end; x++) {
        if (data.data[(y * w + x) * 4 + 3] > 10) {
          hasPixel = true;
          break;
        }
      }
      if (hasPixel) {
        if (top === -1) top = y;
        bottom = y;
      }
    }
    return {
      x: seg.start,
      y: top,
      width: seg.end - seg.start + 1,
      height: bottom - top + 1,
      centerX: seg.start + (seg.end - seg.start) / 2
    };
  });

  return boxes;
}

export async function loadAndProcessImage(asBlob: Blob, category: string | null = null): Promise<{ canvas: HTMLCanvasElement, bbox: any, originalWidth: number, originalHeight: number }> {
  const { removeBackground } = await import("@imgly/background-removal");
  const bgRemovedBlob = await removeBackground(asBlob, {
    progress: () => {},
  });
  
  const bgRemovedUrl = URL.createObjectURL(bgRemovedBlob);
  
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = bgRemovedUrl;
  });

  // FULL RES CANVAS
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
  let duplicateMode = false;

  if (boxes.length > 0) {
    const imgCenterX = img.width / 2;
    
    if (category === "Earrings") {
      // Find the single central earring
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
      
      // Check if it's already a pair that was merged (aspect ratio width/height > 1.2)
      const aspectRatio = finalBbox.width / finalBbox.height;
      if (aspectRatio < 1.2) {
        duplicateMode = true;
      }
    } else {
      // Not earrings: isolate the central object
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
  }

  let finalCanvas = document.createElement("canvas");
  
  if (duplicateMode) {
    // Duplicate the single central earring side-by-side
    const gap = Math.floor(finalBbox.width * 0.5);
    finalCanvas.width = finalBbox.width * 2 + gap;
    finalCanvas.height = finalBbox.height;
    const fCtx = finalCanvas.getContext("2d")!;
    
    // Draw left copy
    fCtx.drawImage(canvas, finalBbox.x, finalBbox.y, finalBbox.width, finalBbox.height, 0, 0, finalBbox.width, finalBbox.height);
    // Draw right copy
    fCtx.drawImage(canvas, finalBbox.x, finalBbox.y, finalBbox.width, finalBbox.height, finalBbox.width + gap, 0, finalBbox.width, finalBbox.height);
    
    finalBbox.width = finalCanvas.width;
    finalBbox.x = 0; 
    finalBbox.y = 0;
  } else {
    // Standard tight crop
    finalCanvas.width = finalBbox.width;
    finalCanvas.height = finalBbox.height;
    const fCtx = finalCanvas.getContext("2d")!;
    fCtx.drawImage(canvas, finalBbox.x, finalBbox.y, finalBbox.width, finalBbox.height, 0, 0, finalBbox.width, finalBbox.height);
  }
  
  URL.revokeObjectURL(bgRemovedUrl);

  return { canvas: finalCanvas, bbox: finalBbox, originalWidth: img.width, originalHeight: img.height };
}

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

export interface LightingAdjustments {
  brightness: number;
  contrast: number;
  saturate: number;
}

export function calculateAutoLighting(canvas: HTMLCanvasElement): LightingAdjustments {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { brightness: 100, contrast: 100, saturate: 100 };

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  
  let totalLuminance = 0;
  let pixelCount = 0;
  
  // First pass: Calculate average luminance
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 10) { // Only count non-transparent pixels
      // Luminance formula (perceptual)
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      totalLuminance += lum;
      pixelCount++;
    }
  }

  if (pixelCount === 0) return { brightness: 100, contrast: 100, saturate: 100 };

  const avgLuminance = totalLuminance / pixelCount;
  
  // Second pass: Calculate standard deviation (contrast indicator)
  let sumOfSquares = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 10) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sumOfSquares += Math.pow(lum - avgLuminance, 2);
    }
  }
  
  const stdDev = Math.sqrt(sumOfSquares / pixelCount);
  
  // Determine adjustments (in percentages: 100 = 1.0)
  let brightness = 100;
  let contrast = 100;
  let saturate = 100;

  // Target optimal average luminance for jewelry is around 170
  if (avgLuminance < 150) {
    // Too dark, increase brightness (max +40%)
    brightness += Math.min(40, (150 - avgLuminance) * 0.8);
  } else if (avgLuminance > 220) {
    // Too bright, slightly decrease brightness
    brightness -= Math.min(15, (avgLuminance - 220) * 0.5);
  }

  // Target standard deviation is around 60 (good contrast)
  if (stdDev < 50) {
    // Dull image, increase contrast (max +30%)
    contrast += Math.min(30, (50 - stdDev) * 1.5);
    // Boosting contrast on dull images usually requires a slight saturation boost
    saturate += Math.min(20, (50 - stdDev) * 1.0);
  } else if (stdDev > 80) {
    // Extremely high contrast (harsh shadows/highlights)
    contrast -= Math.min(10, (stdDev - 80) * 0.3);
  }

  return { 
    brightness: Math.round(brightness), 
    contrast: Math.round(contrast), 
    saturate: Math.round(saturate) 
  };
}
