import type {State} from './store';
import {balance} from './store';
import {monthlyReport} from './reports';
import {exactMoney,monthLabel} from '../lib';
export type ReportData={title:string;period:string;scope:string;headers:string[];rows:string[][];totals:{billed:number;paid:number;outstanding:number};note:string};
export function buildReport(state:State,params:URLSearchParams):ReportData{
 const site=params.get('site')??'',vendor=params.get('vendor')??'',month=params.get('month');const year=Number(params.get('year'))||new Date().getFullYear();
 const receipts=state.receipts.filter(r=>(!site||r.site===site)&&(!vendor||r.vendor===vendor));
 const scope=[site?state.sites.find(s=>s.id===site)?.name:'All sites',vendor?state.vendors.find(v=>v.id===vendor)?.name:'All vendors'].join(' / ');
 if(month){const rows=receipts.filter(r=>r.date.startsWith(month));return {title:'Monthly vendor ledger',period:monthLabel(month),scope,totals:balance(rows),headers:['Vendor','Receipts','Billed (Rs)','Paid (Rs)','Remaining (Rs)','Status'],rows:state.vendors.map(v=>{const matches=rows.filter(r=>r.vendor===v.id);const b=balance(matches);return matches.length?[v.name,String(matches.length),exactMoney(b.billed),exactMoney(b.paid),exactMoney(b.outstanding),b.outstanding?b.paid?'Partial':'Unpaid':'Settled']:null;}).filter((r):r is string[]=>!!r),note:'Balances relate to receipts billed in this month. Paid includes later settlements. No funds are transferred by this report.'};}
 const summary=monthlyReport(receipts,year);return {title:'Annual material account',period:String(year),scope,totals:balance(receipts.filter(r=>r.date.startsWith(String(year)))),headers:['Month','Billed (Rs)','Paid on bills (Rs)','Remaining (Rs)','Cash paid (Rs)'],rows:summary.map(r=>[monthLabel(r.month),exactMoney(r.billed),exactMoney(r.paid),exactMoney(r.outstanding),exactMoney(r.cashPaid)]),note:'Paid on bills includes later settlements. Cash paid follows actual payment dates, including payments for older bills. Amounts must not be added together.'};
}
