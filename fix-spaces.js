const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

code = code.replace(
  `  const nameWithoutExt = filename.replace(/\\.\\[^/.]+\$/, "");\n  const tokens = nameWithoutExt.split(" ");`,
  `  const nameWithoutExt = filename.replace(/\\.\\[^/.]+\$/, "").trim();\n  const tokens = nameWithoutExt.split(/\\s+/);`
);

fs.writeFileSync('src/lib/imageProcessor.ts', code);
console.log("Success: robustness added");
