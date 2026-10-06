import { describe, it, expect } from 'vitest';
import { createStore, total, KEY, parseState, type ReceiptInput } from '../src/data/store';

function setup(initial?: string) {
  const values = new Map<string,string>(initial ? [[KEY,initial]] : []);
  let fail = false;
  const storage = { getItem:(key:string)=>values.get(key)??null, setItem:(key:string,value:string)=>{if(fail)throw Error('quota'); values.set(key,value);} };
  const store = createStore(storage);
  return {store,storage,fail:()=>{fail=true;},reload:()=>createStore(storage)};
}
const input = ():ReceiptInput => ({vendor:'v1',site:'s1',date:'2024-06-12',payment:'Partial',paid:500,items:[{description:'Nuts',quantity:3,unit:'Dozen',rate:250.25},{description:'Steel',quantity:2.5,unit:'Kg',rate:265}],image:'',reference:'TEST-1',notes:''});

describe('receipt and settlement integrity',()=>{
  it('calculates fractional quantities and multiple lines precisely',()=>{
    expect(total({items:input().items})).toBe(1413.25);
  });
  it('creates unique codes and persists amounts and vendor references',()=>{
    const {store,reload}=setup(); const a=store.addReceipt(input());
    const b=store.addReceipt({...input(),reference:'TEST-2',payment:'Paid'});
    expect(a.code).not.toBe(b.code);
    expect(reload().getSnapshot().receipts.find(r=>r.id===a.id)?.paid).toBe(500);
    expect(b.paid).toBe(1413.25);
  });
  it('rejects invalid vendors, references, lines, dates and partial amounts',()=>{
    const {store}=setup();
    const changes:Partial<ReceiptInput>[]=[{vendor:'v8'},{site:'missing'},{items:[]},{items:[{description:' ',quantity:1,unit:'Kg',rate:1}]},{paid:2000},{paid:0},{items:[{description:'Steel',quantity:0,unit:'Kg',rate:200}]},{date:'2026-02-31'}];
    for(const change of changes){
      expect(()=>store.addReceipt({...input(),...change})).toThrow();
    }
  });
  it('rejects an accidentally repeated vendor bill reference',()=>{
    const {store}=setup();store.addReceipt(input());
    expect(()=>store.addReceipt(input())).toThrow(/reference/i);
  });
  it('settles one vendor/month only and records only remaining debt',()=>{
    const {store}=setup();
    const a=store.addReceipt(input());
    const b=store.addReceipt({...input(),date:'2024-07-12',reference:'TEST-2'});
    const c=store.addReceipt({...input(),vendor:'v2'});
    const result=store.settle('v1','2024-06');
    expect(result.amount).toBe(913.25);
    const rows=store.getSnapshot().receipts;
    expect(rows.find(r=>r.id===a.id)?.paid).toBe(1413.25);
    expect(rows.find(r=>r.id===b.id)?.paid).toBe(500);
    expect(rows.find(r=>r.id===c.id)?.paid).toBe(500);
    expect(()=>store.settle('v1','2024-06')).toThrow();
    expect(store.getSnapshot().settlements).toHaveLength(1);
  });
  it('can settle disabled vendors while refusing new purchases from them',()=>{
    const {store}=setup(); store.addReceipt(input());store.toggleVendor('v1');
    expect(store.settle('v1','2024-06').amount).toBe(913.25);
    expect(()=>store.addReceipt({...input(),reference:'TEST-2'})).toThrow();
  });
  it('rolls back all state when persistence fails',()=>{
    const {store,fail}=setup();store.addReceipt(input());const before=JSON.stringify(store.getSnapshot());fail();
    expect(()=>store.settle('v1','2024-06')).toThrow(/save/i);
    expect(JSON.stringify(store.getSnapshot())).toBe(before);
    expect(()=>store.addReceipt({...input(),reference:'TEST-2'})).toThrow();
    expect(JSON.stringify(store.getSnapshot())).toBe(before);
  });
  it('does not overwrite damaged storage and blocks mutations',()=>{
    const {store,storage}=setup('{broken');
    expect(store.getError()).toBeTruthy();
    expect(()=>store.addReceipt(input())).toThrow();
    expect(storage.getItem(KEY)).toBe('{broken');
  });
  it('validates imported references and rejects receipt overpayments',()=>{
    const state=structuredClone(setup().store.getSnapshot());state.receipts[0].vendor='missing';
    expect(()=>parseState(state)).toThrow();
    const other=structuredClone(setup().store.getSnapshot());other.receipts[0].paid=1e12;
    expect(()=>parseState(other)).toThrow();
  });
  it('merges writes with latest persisted data from another tab',()=>{
    const {store,storage}=setup();const second=createStore(storage);
    store.addReceipt(input());second.addReceipt({...input(),reference:'SECOND'});
    expect(createStore(storage).getSnapshot().receipts.filter(r=>r.reference==='TEST-1'||r.reference==='SECOND')).toHaveLength(2);
  });
  it('publishes a new snapshot when another tab corrupts storage',()=>{
    const {store,storage}=setup();const before=store.getSnapshot();
    storage.setItem(KEY,'{broken');store.refresh();
    expect(store.getError()).toBeTruthy();
    expect(store.getSnapshot()).not.toBe(before);
    expect(store.getSnapshot().receipts).toEqual(before.receipts);
  });
  it('restores a valid backup and preserves linked receipts and payments',()=>{
    const original=setup();original.store.addReceipt(input());
    original.store.settle('v1','2024-06');
    const backup=JSON.parse(original.store.rawBackup());const target=setup();
    target.store.restore(backup);
    expect(target.store.getSnapshot()).toEqual(original.store.getSnapshot());
    expect(createStore(target.storage).getSnapshot()).toEqual(original.store.getSnapshot());
  });
  it('rejects an invalid restore without replacing saved records',()=>{
    const {store,storage}=setup();const before=storage.getItem(KEY);
    expect(()=>store.restore({version:1,receipts:[]})).toThrow();
    expect(storage.getItem(KEY)).toBe(before);
  });
});
