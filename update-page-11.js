const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

const regex = /      const cacheKey = target\.id;/;
const replacement = `      const cacheKey = target.kembarId || target.id;`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/app/dashboard/page.tsx', code);
  console.log("Fixed cacheKey for kembar files");
} else {
  console.log("Regex did not match!");
}
