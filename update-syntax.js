const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

const oldBlock = `    if (category === "Earrings") {
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
    }`;

const newBlock = `    if (category === "Earrings") {
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
    }`;

if (!code.includes('aspectRatio < 1.2')) {
  console.log("String not found?");
} else {
  code = code.replace(oldBlock, newBlock);
  
  // also let's just make sure `let isPair = false;` is removed since it's unused.
  code = code.replace('let isPair = false;', '');
  
  fs.writeFileSync('src/lib/imageProcessor.ts', code);
  console.log("Success");
}
