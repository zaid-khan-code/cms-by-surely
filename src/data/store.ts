import { z } from 'zod';
import rawSeed from './seed.json';

export const KEY = 'surely-cms.prototype.v1';
export const categories = ['Steel','Tiles','Paint','Hardware','Decor','Cement','Fasteners','Other'] as const;
export const units = ['Piece','Kg','Bag','Dozen','Meter','Foot','Sq. ft','Box','Set','Drum','Litre','Ton'] as const;
const text = z.string().trim().min(1).max(160);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d=new Date(`${v}T12:00:00Z`); return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===v; },'Enter a valid calendar date');
const amount = z.number().finite().min(0).max(1e12);
const image = z.string().max(1900000).refine(v=>!v||/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v),'Use a JPEG, PNG or WebP image');
const vendorSchema = z.object({id:text,code:text,name:text,category:z.enum(categories),contact:z.string().max(100),phone:z.string().max(30),active:z.boolean(),sites:z.array(text),createdAt:date,disabledAt:date.nullable()});
const siteSchema = z.object({id:text,name:text,plot:text,location:text,status:z.enum(['Active','Completed','On Hold']),value:amount,start:date,featured:z.boolean(),style:z.number().int().min(0).max(3),image,description:z.string().max(2500),createdAt:date});
const materialSchema = z.object({id:text,name:text,unit:z.enum(units),category:z.enum(categories),active:z.boolean()});
const itemSchema = z.object({materialId:text.optional(),description:text,quantity:z.number().finite().positive().max(1e8),unit:z.enum(units),rate:z.number().finite().positive().max(1e9)});
const paymentSchema = z.object({amount,date});
const receiptSchema = z.object({id:text,code:text,vendor:text,site:text,date,items:z.array(itemSchema).min(1).max(100),paid:amount,payments:z.array(paymentSchema),image,reference:z.string().trim().max(80),notes:z.string().max(2000),createdAt:date});
const settlementSchema = z.object({id:text,vendor:text,month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),amount,receipts:z.array(text),date});
const companySchema = z.object({tagline:text,foundingYear:z.number().int().min(1900).max(new Date().getFullYear()).nullable(),phone:z.string().max(30),email:z.union([z.literal(''),z.email()]),about:z.string().max(2500)});
const stateSchema = z.object({version:z.literal(1),materials:z.array(materialSchema).default([]),vendors:z.array(vendorSchema),sites:z.array(siteSchema),receipts:z.array(receiptSchema),settlements:z.array(settlementSchema),company:companySchema});
export type Material = z.infer<typeof materialSchema>;
export type MaterialInput = Pick<Material,'name'|'unit'|'category'>;
export const materialKey=(name:string,unit:string)=>JSON.stringify([name.trim().replace(/\s+/g,' ').toLowerCase(),unit]);
export type Vendor = z.infer<typeof vendorSchema>;
export type Site = z.infer<typeof siteSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
export type State = z.infer<typeof stateSchema>;
export type Company = State['company'];
export type VendorInput = Pick<Vendor,'name'|'category'|'contact'|'phone'>;
export type SiteInput = Omit<Site,'id'|'style'|'createdAt'>;
export type ReceiptInput = Pick<Receipt,'vendor'|'site'|'date'|'items'|'image'|'reference'|'notes'> & {payment:'Unpaid'|'Partial'|'Paid';paid:number};
export const round = (n:number) => Math.round((n+Number.EPSILON)*100)/100;
export const total = (receipt:Pick<Receipt,'items'>) => round(receipt.items.reduce((n,i)=>n+round(i.quantity*i.rate),0));
export const balance = (rows:Receipt[]) => ({billed:round(rows.reduce((n,r)=>n+total(r),0)),paid:round(rows.reduce((n,r)=>n+r.paid,0)),outstanding:round(rows.reduce((n,r)=>n+total(r)-r.paid,0))});
export const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export const paymentStatus = (r:Receipt) => r.paid>=total(r)?'Paid':r.paid>0?'Partial':'Unpaid';
export function parseState(value:unknown):State {
  const s=stateSchema.parse(value);
  if(value && typeof value==='object' && !('materials' in value)){
    const seen=new Set<string>();
    for(const r of s.receipts)for(const item of r.items){const key=materialKey(item.description,item.unit);if(!seen.has(key)){seen.add(key);s.materials.push({id:`MAT-LEGACY-${seen.size}`,name:item.description,unit:item.unit,category:s.vendors.find(v=>v.id===r.vendor)?.category??'Other',active:true});}}
  }
  if(new Set(s.materials.map(m=>materialKey(m.name,m.unit))).size!==s.materials.length)throw Error('Duplicate materials in backup.');
  for(const collection of [s.materials,s.vendors,s.sites,s.receipts,s.settlements]) if(new Set(collection.map(x=>x.id)).size!==collection.length)throw Error('Duplicate record IDs in backup.');
  if(new Set(s.vendors.map(v=>v.code)).size!==s.vendors.length||new Set(s.receipts.map(r=>r.code)).size!==s.receipts.length)throw Error('Duplicate record codes in backup.');
  for(const v of s.vendors)if(v.sites.some(id=>!s.sites.some(site=>site.id===id)))throw Error('A vendor references a missing site.');
  for(const r of s.receipts){
    if(r.items.some(i=>i.materialId&&!s.materials.some(m=>m.id===i.materialId)))throw Error("A receipt references a missing material.");
    if(!s.vendors.some(v=>v.id===r.vendor)||!s.sites.some(site=>site.id===r.site))throw Error('A receipt references a missing vendor or site.');
    if(total(r)<=0||total(r)>1e12||r.paid>total(r)||round(r.payments.reduce((n,p)=>n+p.amount,0))!==r.paid)throw Error('Invalid receipt payment or total.');
  }
  for(const settlement of s.settlements)if(!s.vendors.some(v=>v.id===settlement.vendor)||settlement.receipts.some(id=>!s.receipts.some(r=>r.id===id&&r.vendor===settlement.vendor&&r.date.startsWith(settlement.month))))throw Error('Invalid settlement reference.');
  return s;
}
function seed():State {
  const month=today().slice(0,7);
  const receipts:Receipt[]=rawSeed.receipts.map(r=>{const receiptDate=r.date.startsWith('2026-09')?month+'-'+String(Math.min(Number(r.date.slice(8)),Number(today().slice(8)))).padStart(2,'0'):r.date;return {id:r.id,code:r.code,vendor:r.vendor,site:r.site,date:receiptDate,items:[{description:r.description,quantity:r.quantity,unit:r.unit as Item['unit'],rate:r.rate}],paid:r.paid,payments:r.paid?[{amount:r.paid,date:receiptDate}]:[],image:'',reference:'',notes:'Demonstration receipt.',createdAt:receiptDate};});
  for(let i=2;i<10;i++){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-12`;const billed=580000+(i%4)*185000;receipts.push({id:`history-${i}`,code:`REC-${d.getFullYear()}-${String(200+i).padStart(4,'0')}`,vendor:i%2?'v1':'v6',site:'s2',date,items:[{description:i%2?'Reinforcement steel':'Cement delivery',quantity:1000,unit:i%2?'Kg':'Bag',rate:billed/1000}],paid:billed,payments:[{amount:billed,date}],image:'',reference:'',notes:'Demonstration receipt.',createdAt:date});}
  return parseState({version:1,vendors:rawSeed.vendors.map(v=>({...v,createdAt:'2024-01-01',disabledAt:v.active?null:'2026-01-01'})),sites:rawSeed.sites.map(s=>({...s,image:'',description:'A thoughtfully planned residence, built with attention to detail from structure to finishing. This is a sample project for design review.',createdAt:s.start})),receipts,settlements:[],company:{tagline:'Thoughtfully built. Beautifully lived.',foundingYear:null,phone:'',email:'',about:'CMS by Surely brings thoughtful planning, quality materials, and careful craftsmanship to residential construction. Explore a selection of our projects.'}});
}
type StorageAdapter=Pick<Storage,'getItem'|'setItem'>;
export function createStore(storage:StorageAdapter){
  let state=seed(),error='';
  const listeners=new Set<()=>void>();
  try{const raw=storage.getItem(KEY);if(raw)state=parseState(JSON.parse(raw));else storage.setItem(KEY,JSON.stringify(state));}catch{error='Saved data could not be loaded. Sample data is shown read-only. Download your existing data from Data & backup before restoring a valid backup.';}
  const publish=()=>listeners.forEach(fn=>fn());
  function commit<T>(update:(s:State)=>T):T{
    if(error)throw Error(error);
    let next:State;
    try{const raw=storage.getItem(KEY);next=raw?parseState(JSON.parse(raw)):structuredClone(state);}catch{throw Error('Saved data changed unexpectedly. Reload before making changes.');}
    const result=update(next); next=parseState(next);
    try{storage.setItem(KEY,JSON.stringify(next));}catch{throw Error('Could not save: browser storage is full or unavailable. Download a backup and free browser storage, then try again.');}
    state=next;publish();return result;
  }
  return {
    getSnapshot:()=>state,getError:()=>error,subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};},
    refresh:()=>{try{const raw=storage.getItem(KEY);if(raw){state=parseState(JSON.parse(raw));error='';}else error='Browser storage was cleared. Your current view is retained; export a backup before reloading.';}catch{error='Saved data is invalid. Export the current view before restoring a backup.';}state={...state};publish();},
    rawBackup:()=>storage.getItem(KEY)??JSON.stringify(state),
    restore:(value:unknown)=>{const next=parseState(value);try{storage.setItem(KEY,JSON.stringify(next));}catch{throw Error('Could not save this backup. Browser storage may be full.');}state=next;error='';publish();},
    saveMaterial:(input:MaterialInput)=>commit(s=>{const parsed=materialSchema.parse({...input,name:input.name.trim().replace(/\s+/g,' '),id:crypto.randomUUID(),active:true});if(s.materials.some(m=>materialKey(m.name,m.unit)===materialKey(parsed.name,parsed.unit)))throw Error('This material and unit already exist. Enable it in Materials if archived.');s.materials.push(parsed);return parsed;}),
    toggleMaterial:(id:string)=>commit(s=>{const m=s.materials.find(m=>m.id===id);if(!m)throw Error('Material not found.');m.active=!m.active;}),
    saveVendor:(input:VendorInput,id?:string)=>commit(s=>{const existing=s.vendors.find(v=>v.id===id);if(id&&!existing)throw Error('Vendor not found.');const parsed=vendorSchema.parse({...input,id:id??crypto.randomUUID(),code:existing?.code??`VND-${String(Math.max(0,...s.vendors.map(v=>Number(v.code.split('-')[1])||0))+1).padStart(4,'0')}`,active:existing?.active??true,sites:existing?.sites??[],createdAt:existing?.createdAt??today(),disabledAt:existing?.disabledAt??null});if(s.vendors.some(v=>v.id!==id&&v.name.toLowerCase()===parsed.name.toLowerCase()))throw Error('A vendor with this name already exists.');if(parsed.phone&&!/^[+0-9() .-]{7,30}$/.test(parsed.phone))throw Error('Enter a valid phone number.');if(existing)Object.assign(existing,parsed);else s.vendors.push(parsed);return parsed;}),
    toggleVendor:(id:string)=>commit(s=>{const v=s.vendors.find(v=>v.id===id);if(!v)throw Error('Vendor not found.');v.active=!v.active;v.disabledAt=v.active?null:today();}),
    saveSite:(input:SiteInput,id?:string,vendorId?:string)=>commit(s=>{const existing=s.sites.find(x=>x.id===id);if(id&&!existing)throw Error('Site not found.');const parsed=siteSchema.parse({...input,id:id??crypto.randomUUID(),style:existing?.style??s.sites.length%4,createdAt:existing?.createdAt??today()});if(s.sites.some(x=>x.id!==id&&x.plot.toLowerCase()===parsed.plot.toLowerCase()&&x.location.toLowerCase()===parsed.location.toLowerCase()))throw Error('This plot already exists at this location.');if(existing)Object.assign(existing,parsed);else s.sites.push(parsed);if(vendorId){const v=s.vendors.find(v=>v.id===vendorId);if(!v)throw Error('Vendor not found.');v.sites=[...new Set([...v.sites,parsed.id])];}return parsed;}),
    linkSite:(vendorId:string,siteId:string)=>commit(s=>{const v=s.vendors.find(v=>v.id===vendorId);if(!v||!s.sites.some(x=>x.id===siteId))throw Error('Vendor or site not found.');v.sites=[...new Set([...v.sites,siteId])];}),
    featureSite:(id:string)=>commit(s=>{const site=s.sites.find(x=>x.id===id);if(!site)throw Error('Site not found.');site.featured=!site.featured;}),
    saveCompany:(input:Company)=>commit(s=>{s.company=companySchema.parse(input);}),
    addReceipt:(input:ReceiptInput)=>commit(s=>{
      if(!s.vendors.some(v=>v.id===input.vendor&&v.active))throw Error('Choose an active vendor.');
      if(!s.sites.some(x=>x.id===input.site))throw Error('Choose a construction site.');
      const receiptDate=date.parse(input.date);if(receiptDate>today())throw Error('Receipt date cannot be in the future.');
      const items=z.array(itemSchema).min(1).max(100).parse(input.items);for(const item of items){if(item.materialId){const material=s.materials.find(m=>m.id===item.materialId&&m.active);if(!material)throw Error('Choose an active material.');item.description=material.name;}}const billed=total({items});if(billed>1e12)throw Error('Receipt amount exceeds the supported range.');
      const status=z.enum(['Unpaid','Partial','Paid']).parse(input.payment);
      const paid=status==='Paid'?billed:status==='Partial'?round(amount.parse(input.paid)):0;
      if(status==='Partial'&&(paid<=0||paid>=billed))throw Error('Partial payment must be greater than zero and less than the receipt total.');
      const reference=input.reference.trim();if(reference&&s.receipts.some(r=>r.vendor===input.vendor&&r.reference.toLowerCase()===reference.toLowerCase()))throw Error('This vendor bill reference is already recorded.');
      const year=receiptDate.slice(0,4);const max=Math.max(0,...s.receipts.filter(r=>r.code.startsWith(`REC-${year}-`)).map(r=>Number(r.code.split('-')[2])||0));
      const r=receiptSchema.parse({...input,items,id:crypto.randomUUID(),code:`REC-${year}-${String(max+1).padStart(4,'0')}`,paid,payments:paid?[{amount:paid,date:receiptDate}]:[],reference,createdAt:today()});
      s.receipts.push(r);return r;
    }),
    settle:(vendor:string,month:string)=>commit(s=>{
      if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Choose a valid month.');
      const receipts=s.receipts.filter(r=>r.vendor===vendor&&r.date.startsWith(month)&&r.paid<total(r));
      const amount=balance(receipts).outstanding;if(!amount)throw Error('This vendor has no outstanding balance for the selected month.');
      const settlement={id:crypto.randomUUID(),vendor,month,amount,receipts:receipts.map(r=>r.id),date:today()};
      for(const r of receipts){r.payments.push({amount:round(total(r)-r.paid),date:today()});r.paid=total(r);}
      s.settlements.push(settlement);return settlement;
    })
  };
}
export type LedgerStore=ReturnType<typeof createStore>;
