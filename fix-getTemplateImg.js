const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf-8');

const missingFunc = `let globalTemplateImg: HTMLImageElement | null = null;
const getTemplateImg = async (): Promise<HTMLImageElement> => {
  if (globalTemplateImg) return globalTemplateImg;
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { globalTemplateImg = img; res(img); };
    img.onerror = rej;
    img.src = "/Kosongan No Bg.png";
  });
};

export default function Dashboard() {`;

code = code.replace('export default function Dashboard() {', missingFunc);
fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log("Restored getTemplateImg");
