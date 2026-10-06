import { round, type Receipt, type Item } from './store';
export type MaterialSummary={key:string;description:string;unit:Item['unit'];quantity:number;amount:number;receipts:string[];vendors:string[]};
export function summarizeMaterials(receipts:Receipt[]):MaterialSummary[]{
 const groups=new Map<string,MaterialSummary>();
 for(const receipt of receipts)for(const item of receipt.items){
  const description=item.description.trim().replace(/\s+/g,' '),key=JSON.stringify([description.toLowerCase(),item.unit]);
  const row=groups.get(key)??{key,description,unit:item.unit,quantity:0,amount:0,receipts:[],vendors:[]};
  row.quantity=Math.round((row.quantity+item.quantity)*1e6)/1e6;
  row.amount=round(row.amount+round(item.quantity*item.rate));
  if(!row.receipts.includes(receipt.id))row.receipts.push(receipt.id);
  if(!row.vendors.includes(receipt.vendor))row.vendors.push(receipt.vendor);
  groups.set(key,row);
 }
 return [...groups.values()].sort((a,b)=>a.description.localeCompare(b.description)||a.unit.localeCompare(b.unit));
}
