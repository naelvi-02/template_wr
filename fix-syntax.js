const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/components.tsx', 'utf-8');

const toRemove = `let globalTemplateImg: HTMLImageElement | null = null;
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

export default `;

code = code.replace(toRemove, '');
fs.writeFileSync('src/app/dashboard/components.tsx', code);
console.log("Fixed components.tsx syntax error");
