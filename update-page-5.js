const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

// Fix interface JewelryFile
const interfaceRegex = /    posY\?: number;\n\}/;
const interfaceReplacement = `    posY?: number;
    autoAdjust?: boolean;
    brightness?: number;
    contrast?: number;
    saturate?: number;
}`;
code = code.replace(interfaceRegex, interfaceReplacement);

// Fix import
if (!code.includes('calculateAutoLighting')) {
  code = code.replace(/import \{ loadAndProcessImage \} from "@\/lib\/imageProcessor";/, 'import { loadAndProcessImage, calculateAutoLighting } from "@/lib/imageProcessor";');
}

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Success step 4 page.tsx");
