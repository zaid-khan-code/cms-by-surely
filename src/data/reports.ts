import { balance,round,type Receipt } from './store';
export function monthlyReport(receipts:Receipt[],year:number){
 return Array.from({length:12},(_,index)=>{const month=`${year}-${String(index+1).padStart(2,'0')}`;const rows=receipts.filter(r=>r.date.startsWith(month));return {month,count:rows.length,...balance(rows),cashPaid:round(receipts.reduce((sum,r)=>sum+r.payments.filter(p=>p.date.startsWith(month)).reduce((n,p)=>n+p.amount,0),0))};});
}
