import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter,Routes,Route,Link } from 'react-router-dom';
import { Provider } from './context';
import Layout from './components/Layout';
import { Empty } from './components/ui';
const Dashboard=lazy(()=>import('./pages/Dashboard'));
const Vendors=lazy(()=>import('./pages/Vendors'));
const VendorDetail=lazy(()=>import('./pages/Vendors').then(m=>({default:m.VendorDetail})));
const Sites=lazy(()=>import('./pages/Sites'));
const SiteDetail=lazy(()=>import('./pages/Sites').then(m=>({default:m.SiteDetail})));
const Receipts=lazy(()=>import('./pages/Receipts'));
const NewReceipt=lazy(()=>import('./pages/Receipts').then(m=>({default:m.NewReceipt})));
const ReceiptDetail=lazy(()=>import('./pages/Receipts').then(m=>({default:m.ReceiptDetail})));
const Materials=lazy(()=>import('./pages/Materials'));
const Reports=lazy(()=>import('./pages/Reports'));
const ReportDocument=lazy(()=>import('./pages/ReportDocument'));
const Ledger=lazy(()=>import('./pages/Ledger'));
const Showcase=lazy(()=>import('./pages/Showcase'));
const PublicProject=lazy(()=>import('./pages/Showcase').then(m=>({default:m.PublicProject})));
class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(error:Error,info:ErrorInfo){console.error('Prototype rendering error',error,info.componentStack);}render(){return this.state.failed?<main className="error-page"><h1>This page could not be displayed.</h1><p>Your saved browser data has not been reset. Reload to try again.</p><button className="button primary" onClick={()=>location.reload()}>Reload prototype</button></main>:this.props.children;}}
export default function App(){return <ErrorBoundary><Provider><BrowserRouter><Suspense fallback={<section className="workspace-loading" role="status" aria-live="polite" aria-busy="true"><span className="loading-label">CMS by Surely</span><h1>Opening your workspace</h1><p>Preparing the frontend prototype…</p><div className="loading-skeleton" aria-hidden="true"><div/><div/><div/></div></section>}><Routes><Route element={<Layout/>}><Route index element={<Dashboard/>}/><Route path="materials" element={<Materials/>}/><Route path="reports" element={<Reports/>}/><Route path="vendors" element={<Vendors/>}/><Route path="vendors/:id" element={<VendorDetail/>}/><Route path="sites" element={<Sites/>}/><Route path="sites/:id" element={<SiteDetail/>}/><Route path="receipts" element={<Receipts/>}/><Route path="receipts/new" element={<NewReceipt/>}/><Route path="receipts/:id" element={<ReceiptDetail/>}/><Route path="ledger" element={<Ledger/>}/><Route path="portfolio" element={<Showcase preview/>}/><Route path="*" element={<Empty title="Page not found" action={<Link className="button primary" to="/">Back to Dashboard</Link>}/>}/></Route><Route path="report" element={<ReportDocument/>}/><Route path="showcase" element={<div className="public-layout"><Showcase/></div>}/><Route path="showcase/:id" element={<div className="public-layout"><PublicProject/></div>}/></Routes></Suspense></BrowserRouter></Provider></ErrorBoundary>;}
