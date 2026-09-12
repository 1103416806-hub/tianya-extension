import './pdf-compat.js';
// Keep the main library and worker on the same legacy build. A worker has its
// own JavaScript environment, so window-only polyfills cannot fix PDF imports.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth/mammoth.browser.js';
pdfjs.GlobalWorkerOptions.workerSrc=chrome.runtime.getURL('pdf.worker.mjs');
export async function extractFile(file){
 if(file.size>12*1024*1024)throw Error('首版支持 12 MB 以内的简历。');
 const ext=file.name.split('.').pop().toLowerCase();
 if(ext==='txt')return file.text();
 const arrayBuffer=await file.arrayBuffer();
 if(ext==='docx'){
  const result=await mammoth.extractRawText({arrayBuffer});
  return result.value;
 }
 if(ext==='pdf'){
  let pdf,loadingTask;
  try{
   loadingTask=pdfjs.getDocument({data:arrayBuffer,isEvalSupported:false,useWasm:false,useWorkerFetch:false,cMapUrl:chrome.runtime.getURL('cmaps/'),cMapPacked:true,standardFontDataUrl:chrome.runtime.getURL('standard_fonts/'),stopAtErrors:true});
   pdf=await loadingTask.promise;
   if(pdf.numPages>30)throw Error('首版只处理 30 页以内的简历。');
   const pages=[];
   for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n);const {items}=await page.getTextContent();let text='',lastY=null;
    for(const item of items){if(!('str'in item))continue;const y=item.transform?.[5];if(lastY!==null&&Math.abs(y-lastY)>3)text+='\n';text+=item.str+(item.hasEOL?'\n':' ');lastY=y;}
    pages.push(text);
   }
   const text=pages.join('\n\n').trim();if(text.length<10)throw Error('此 PDF 未提取到文字，可能是扫描件。请粘贴文字或改用 DOCX。');return text;
  }finally{await loadingTask?.destroy();}
 }
 throw Error('支持 PDF、DOCX 和 TXT；旧版 DOC 请先另存为 DOCX。');
}
