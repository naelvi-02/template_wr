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
  
  for (let i = 0; i < tokens.length; i++) {
    if (/^\d{1,2}K$/i.test(tokens[i])) {
      karat = tokens[i].toUpperCase();
      if (i + 1 < tokens.length) {
        mp = tokens[i + 1];
      }
      break;
    }
  }
  
  return { baseName, karat, mp, isDetail };
}

export function getBoundingBox(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const w = canvas.width, h = canvas.height;
  let top = null, bottom = null, left = null, right = null;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data.data[(y * w + x) * 4 + 3];
      if (alpha > 10) {
        if (top === null) top = y;
        if (bottom === null || y > bottom) bottom = y;
        if (left === null || x < left) left = x;
        if (right === null || x > right) right = x;
      }
    }
  }
  if (top === null || bottom === null || left === null || right === null) return null;
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

export async function loadAndProcessImage(asBlob: Blob): Promise<{ canvas: HTMLCanvasElement, bbox: any, originalWidth: number, originalHeight: number }> {
  // Use imgly for BG removal
  // This will be called from the frontend component
  const { removeBackground } = await import("@imgly/background-removal");
  const bgRemovedBlob = await removeBackground(asBlob, {
    model: "isnet_fp16", // Optimize: Gunakan model yang lebih kecil agar download lebih cepat dan tidak lag
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
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get context");

  // Apply slight enhancement
  ctx.filter = 'brightness(1.03) contrast(1.05) saturate(1.05)';
  ctx.drawImage(img, 0, 0);

  const bbox = getBoundingBox(canvas) || { x: 0, y: 0, width: img.width, height: img.height };
  
  // Create a tightly cropped canvas
  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = bbox.width;
  croppedCanvas.height = bbox.height;
  const croppedCtx = croppedCanvas.getContext("2d");
  if (!croppedCtx) throw new Error("Could not get cropped context");
  
  croppedCtx.drawImage(canvas, bbox.x, bbox.y, bbox.width, bbox.height, 0, 0, bbox.width, bbox.height);
  
  URL.revokeObjectURL(bgRemovedUrl);

  return { canvas: croppedCanvas, bbox, originalWidth: img.width, originalHeight: img.height };
}
