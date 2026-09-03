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
    const prompt = `Klasifikasikan foto perhiasan ini ke SATU kata: single (untuk kalung rantai / gelang rantai - 1 foto grup besar di tengah), grid4 (untuk gelang bangle/kaku - 4 per cover), grid6 (untuk cincin / anting tusuk / liontin / bros - 6 per cover). Lihat bentuk perhiasan, bukan background. Jawab HANYA: single atau grid4 atau grid6.`;
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
