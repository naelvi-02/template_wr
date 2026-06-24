const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

const oldBlock = `  let duplicateMode = false;
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
  }`;

const newBlock = `  if (boxes.length > 0) {
    const imgCenterX = img.width / 2;
    // Always isolate the central object for all categories
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

  let finalCanvas = document.createElement("canvas");
  // Standard tight crop
  finalCanvas.width = finalBbox.width;
  finalCanvas.height = finalBbox.height;
  const fCtx = finalCanvas.getContext("2d")!;
  fCtx.drawImage(canvas, finalBbox.x, finalBbox.y, finalBbox.width, finalBbox.height, 0, 0, finalBbox.width, finalBbox.height);`;

if (!code.includes('duplicateMode')) {
  console.log("String not found?");
} else {
  code = code.replace(oldBlock, newBlock);
  fs.writeFileSync('src/lib/imageProcessor.ts', code);
  console.log("Success");
}
