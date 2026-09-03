import { NextResponse } from "next/server";
let currentKeyIndex = 0;
export async function POST(req: Request) {
  try {
    const { prompt, imageBase64, visionUrl, visionKey, visionModel } = await req.json();
    if (visionUrl && visionKey) {
      const model = visionModel || "ag/gemini-3.7-flash-medium";
      const base = visionUrl.replace(/\/$/, "");
      let data: any = null;
      try {
        const res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${visionKey}` },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: [ { type: "text", text: prompt }, ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : []) ] }],
            temperature: 0.1, max_tokens: 256,
            stream: false,
          }),
        });
        const text = await res.text();
        if (res.ok) {
          try {
            data = JSON.parse(text);
          } catch {
            const match = text.match(/"content":"([^"]+)"/);
            if (match && match[1]) data = { choices: [{ message: { content: match[1] } }] };
          }
        } else {
          console.warn("9router error status:", res.status, text);
        }
      } catch (err: any) {
        console.warn("9router fetch failed:", err?.message);
      }
      if (data?.choices?.[0]?.message?.content) {
        return NextResponse.json({ success: true, message: data.choices[0].message.content });
      }
      // If 9router returned empty or failed, seamlessly fall through to Groq fallback below
    }
    const FALLBACK_KEYS = [process.env.GROQ_API_KEY,process.env.GROQ_API_KEY_2,process.env.GROQ_API_KEY_3].filter(Boolean) as string[];
    if (FALLBACK_KEYS.length === 0) return NextResponse.json({ error: "No Groq API keys configured" }, { status: 500 });
    const payload:any = { model: "meta-llama/llama-4-scout-17b-16e-instruct", messages: [{ role: "user", content: [{ type: "text", text: prompt }] }], temperature: 0.1, max_tokens: 1024 };
    if (imageBase64) payload.messages[0].content.push({ type: "image_url", image_url: { url: imageBase64 } });
    let response; let attempts=0; const maxAttempts=FALLBACK_KEYS.length; let errorText="";
    while(attempts<maxAttempts){
      const k=FALLBACK_KEYS[currentKeyIndex];
      response = await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${k}`},body:JSON.stringify(payload)});
      if(response.ok) break;
      errorText=await response.text();
      if(response.status===429){ currentKeyIndex=(currentKeyIndex+1)%FALLBACK_KEYS.length; attempts++; } else break;
    }
    if(!response||!response.ok) return NextResponse.json({ error: "Groq fail", details: errorText }, { status: response?.status||500 });
    const data=await response.json();
    return NextResponse.json({ success: true, message: data.choices?.[0]?.message?.content||"" });
  } catch(error:any){ return NextResponse.json({ error: error.message }, { status: 500 }); }
}
