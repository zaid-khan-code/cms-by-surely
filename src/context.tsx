import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createStore, KEY, type LedgerStore } from './data/store';
const Context=createContext<LedgerStore|null>(null);
const ToastContext=createContext<(message:string)=>void>(()=>{});
export function Provider({children}:{children:ReactNode}){
  const [store]=useState(()=>createStore({getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)}));
  const [toast,setToast]=useState('');
  useEffect(()=>{const sync=(e:StorageEvent)=>{if(e.key===KEY||e.key===null)store.refresh();};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[store]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(timer);},[toast]);
  return <Context.Provider value={store}><ToastContext.Provider value={setToast}>{children}<div id="toast" className={toast?'show':''} role="status" aria-live="polite">{toast}</div></ToastContext.Provider></Context.Provider>;
}
export function useLedger(){const store=useContext(Context);if(!store)throw Error('Missing application store');const state=useSyncExternalStore(store.subscribe,store.getSnapshot);return {store,state,error:store.getError()};}
export const useToast=()=>useContext(ToastContext);
