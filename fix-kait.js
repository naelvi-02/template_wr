const fs = require('fs');
let code = fs.readFileSync('src/lib/imageProcessor.ts', 'utf-8');

const target = `  let isDetail = false;
  if (tokens[tokens.length - 1] === "2") {
    isDetail = true;
    tokens.pop();
  }`;
  
const replacement = `  let isDetail = false;
  const lastToken = tokens[tokens.length - 1]?.toUpperCase();
  if (lastToken === "2" || lastToken === "KAIT") {
    isDetail = true;
    tokens.pop();
  }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/imageProcessor.ts', code);
console.log("Success: suffix KAIT supported");
