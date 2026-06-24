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
    const prefix = tokens[0].toUpperCase();
    if (prefix === "KL") category = "Necklace";
    else if (prefix === "GL") category = "Bracelet";
    else if (prefix === "CC") category = "Ring";
    else if (prefix === "AT" || prefix === "ANT") category = "Earrings";
    else if (prefix === "LT") category = "Pendant";
    else if (prefix === "BR") category = "Brooch";
  }
  
  for (let i = 0; i < tokens.length; i++) {
    if (/^\d{1,2}K[A-Z]*$/i.test(tokens[i])) {
      karat = tokens[i].toUpperCase();
      if (i + 1 < tokens.length) {
        mp = tokens[i + 1];
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

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get context");

  ctx.filter = 'brightness(1.03) contrast(1.05) saturate(1.05)';
  ctx.drawImage(img, 0, 0);

  // Clean up faint artifacts left by background removal
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < imgData.data.length; i += 4) {
    if (imgData.data[i] < 50) {
      imgData.data[i] = 0;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const boxes = getObjectsBoundingBoxes(canvas);
  let finalBbox = { x: 0, y: 0, width: img.width, height: img.height };
  let duplicateMode = false;
  let isPair = false;

  if (boxes.length > 0) {
    const imgCenterX = img.width / 2;
    
    if (category === "Earrings") {
      if (boxes.length === 2) {
        const centerOfMass = (boxes[0].centerX + boxes[1].centerX) / 2;
        const diff = Math.abs(centerOfMass - imgCenterX);
        // If center of mass is close to image center, treat as a pair
        if (diff < img.width * 0.15) {
          isPair = true;
          const minX = Math.min(boxes[0].x, boxes[1].x);
          const minY = Math.min(boxes[0].y, boxes[1].y);
          const maxX = Math.max(boxes[0].x + boxes[0].width, boxes[1].x + boxes[1].width);
          const maxY = Math.max(boxes[0].y + boxes[0].height, boxes[1].y + boxes[1].height);
          finalBbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
      }
      
      if (!isPair) {
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
