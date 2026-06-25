const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

code = code.replace(
  "  posY?: number;\n}",
  "  posY?: number;\n  autoAdjust?: boolean;\n  brightness?: number;\n  contrast?: number;\n  saturate?: number;\n}"
);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Fixed interface properly");
