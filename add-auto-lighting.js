const fs = require('fs');
const path = 'src/lib/imageProcessor.ts';
let code = fs.readFileSync(path, 'utf-8');

const newCode = `
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
`;

if (!code.includes('calculateAutoLighting')) {
  fs.writeFileSync(path, code + newCode);
  console.log("Added calculateAutoLighting to imageProcessor.ts");
} else {
  console.log("Already exists");
}
