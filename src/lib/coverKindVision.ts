import { CoverKind, detectCoverKind } from "./coverLayout";

export async function detectKindByVision(sampleFile: File, folderName: string): Promise<{kind: CoverKind, conf: number, by: "vision"|"keyword"}> {
  const fallback = detectCoverKind(folderName);
  try {
    // compress to 512 for vision
    const base64: string = await new Promise((resolve, reject)=>{
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e)=>{
        img.onload = ()=>{
          const c = document.createElement("canvas");
          const MAX=512;
          let w=img.width, h=img.height;
          if(w>h && w>MAX){ h*=MAX/w; w=MAX; } else if(h>MAX){ w*=MAX/h; h=MAX; }
          c.width=w; c.height=h;
          const ctx=c.getContext("2d");
          if(ctx) ctx.drawImage(img,0,0,w,h);
          resolve(c.toDataURL("image/jpeg",0.7));
        };
        img.onerror=reject;
        img.src=e.target?.result as string;
      };
      reader.onerror=reject;
      reader.readAsDataURL(sampleFile);
    });
    const prompt = `KAMU ADALAH KLASIFIKATOR PERHIASAN. LIHAT GAMBAR REFERENSI: ANTING GANTUNG/TUSUK=anting, CINCIN=cincin bulat kecil, GELANG BANGLE=gelang kaku tebal melingkar (cover 4), GELANG RANTAI=gelang rantai BANYAK SAMBUNG MEMANJANG di tray (cover single/khusus rantai), LIONTIN=liontin kotak/bulat. KLASIFIKASI: single HANYA untuk kalung rantai ATAU gelang rantai yang terlihat BANYAK MATA RANTAI MEMANJANG di atas tray (BUKAN bangle kaku), grid4 utk bangle/kaku, grid6 utk cincin/anting tusuk/liontin/bros. JIKA NAMPAK BANYAK GELANG BERJEJER MEMANJANG=HAMPIR PASTI single (gelang rantai). JAWAB HANYA: single atau grid4 atau grid6.`;
        const res = await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt, imageBase64: base64, visionUrl:"https://9router.naelvi.com/v1", visionKey:"sk-9router-naelvi-master", visionModel:"ag/gemini-3.7-flash-medium"})});
    if(!res.ok) throw new Error("ai fail");
    const data = await res.json();
    const txt = (data.message||"").toLowerCase();
    let kind: CoverKind | null = null;
    if(txt.includes("single")) kind="single";
    else if(txt.includes("grid4")) kind="grid4";
    else if(txt.includes("grid6")) kind="grid6";
    else if(txt.includes("bangle")) kind="grid4";
    else if(txt.includes("rantai")) kind="single";
    if(kind) return {kind, conf: 0.88, by:"vision"};
  } catch(e){ /* fallback */ }
  return {kind: fallback, conf: 0.6, by:"keyword"};
}
