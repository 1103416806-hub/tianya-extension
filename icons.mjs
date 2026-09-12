import {deflateSync} from 'node:zlib';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
// Small code-native form/check mark, rasterized without an external image service.
const crc=data=>{let c=0xffffffff;for(const byte of data){c^=byte;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
const chunk=(name,data)=>{const type=Buffer.from(name),b=Buffer.alloc(12+data.length);b.writeUInt32BE(data.length);type.copy(b,4);data.copy(b,8);b.writeUInt32BE(crc(Buffer.concat([type,data])),8+data.length);return b;};
export async function makeIcons(out){
 await mkdir(resolve(out,'icons'),{recursive:true});
 for(const size of [16,32,48,128]){
  const pixels=Buffer.alloc((size*4+1)*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const px=(x+.5)/size,py=(y+.5)/size;
   const form=(px>.24&&px<.72&&py>.24&&py<.3)||(px>.24&&px<.56&&py>.44&&py<.50)||(px>.24&&px<.43&&py>.64&&py<.70);
   const check=(px>.55&&px<.67&&Math.abs(py-(px+.03))<.033)||(px>=.65&&px<.84&&Math.abs(py-(-px+1.35))<.033);
   const edgeX=Math.max(.15-px,px-.85,0),edgeY=Math.max(.15-py,py-.85,0),a=edgeX*edgeX+edgeY*edgeY>.0225?0:255;
   const offset=y*(size*4+1)+1+x*4;pixels.set(form||check?[255,255,255,a]:[36,85,235,a],offset);
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  await writeFile(resolve(out,`icons/${size}.png`),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]));
 }
}
