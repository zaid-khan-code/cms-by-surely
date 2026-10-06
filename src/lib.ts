import { z } from 'zod';
export const money=(value:number)=>'Rs '+(value>=1e7?(value/1e7).toFixed(2)+' Cr':value>=1e5?(value/1e5).toFixed(2)+' Lakh':value.toLocaleString('en-PK',{maximumFractionDigits:2}));
export const exactMoney=(value:number)=>'Rs '+value.toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2});
export const formatDate=(value:string)=>new Date(value+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
export const monthLabel=(month:string)=>new Date(month+'-01T12:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'});
export const errorText=(error:unknown)=>error instanceof z.ZodError?error.issues.map(i=>`${i.path.join(' › ')||'Value'}: ${i.message}`).join('. '):error instanceof Error?error.message:'Something went wrong. Please try again.';
export function download(name:string,content:string,type='text/plain'){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export function csv(name:string,rows:(string|number)[][]){download(name,'\uFEFF'+rows.map(row=>row.map(v=>{let s=String(v);if(/^\s*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',')).join('\r\n'),'text/csv;charset=utf-8');}
export async function imageFile(file:File):Promise<string>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPEG, PNG or WebP photo.');
  if(file.size>12*1024*1024)throw Error('Choose a photo smaller than 12 MB.');
  const bitmap=await createImageBitmap(file);
  try{const ratio=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));const context=canvas.getContext('2d');if(!context)throw Error('This browser cannot process photos.');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);let result=canvas.toDataURL('image/jpeg',.78);if(result.length>1900000)result=canvas.toDataURL('image/jpeg',.5);if(result.length>1900000)throw Error('Photo is too large after compression. Choose a smaller image.');return result;}finally{bitmap.close();}
}
