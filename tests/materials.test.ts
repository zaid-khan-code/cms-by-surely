import { describe, expect, it } from 'vitest';
import { summarizeMaterials } from '../src/data/materials';
import { balance, type Receipt } from '../src/data/store';
const receipt=(id:string,vendor:string,items:Receipt['items'])=>({id,vendor,items} as Receipt);
describe('site material totals',()=>{
 it('combines matching descriptions across vendors and preserves receipt evidence',()=>{
 const rows=summarizeMaterials([receipt('a','v1',[{description:' Steel  bar ',unit:'Kg',quantity:1.125,rate:100},{description:'steel bar',unit:'Kg',quantity:2,rate:200}]),receipt('b','v2',[{description:'STEEL BAR',unit:'Kg',quantity:3.5,rate:150}])]);
 expect(rows).toHaveLength(1);expect(rows[0].quantity).toBe(6.625);expect(rows[0].amount).toBe(1037.5);expect(rows[0].receipts).toEqual(['a','b']);expect(rows[0].vendors).toEqual(['v1','v2']);
 });
 it('keeps different units and specifications separate',()=>{
 expect(summarizeMaterials([receipt('a','v1',[{description:'Steel',unit:'Kg',quantity:1,rate:1},{description:'Steel',unit:'Ton',quantity:1,rate:1},{description:'Steel 60',unit:'Kg',quantity:1,rate:1}])])).toHaveLength(3);
 });
 it('handles an empty site',()=>expect(summarizeMaterials([])).toEqual([]));
});

it('reconciles site payments and monthly unpaid portions without other sites',()=>{
 const a={...receipt('a','v1',[{description:'Steel',unit:'Kg',quantity:10,rate:100}]),site:'s1',date:'2026-09-01',paid:300};
 const b={...a,id:'b',date:'2026-08-01',paid:200};
 const other={...a,id:'c',site:'s2',paid:0};
 const rows=[a,b,other].filter(r=>r.site==='s1');
 expect(balance(rows)).toEqual({billed:2000,paid:500,outstanding:1500});
 expect(balance(rows.filter(r=>r.date.startsWith('2026-09'))).outstanding).toBe(700);
});
