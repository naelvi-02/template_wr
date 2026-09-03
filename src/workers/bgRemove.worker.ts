let bgModule: any = null;
async function getBgModule(){
  if(bgModule) return bgModule;
  const mod = await import("@imgly/background-removal");
  bgModule = mod; return mod;
}
self.onmessage = async (e) => {
  const {id, blob} = e.data;
  try {
    const {removeBackground} = await getBgModule();
    const result = await removeBackground(blob, { model: "isnet", progress: ()=>{} });
    self.postMessage({id, ok:true, blob: result});
  } catch(err: any){
    self.postMessage({id, ok:false, error: err?.message || String(err)});
  }
};
