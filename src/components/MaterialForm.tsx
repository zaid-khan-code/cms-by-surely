import {useState,type FormEvent} from 'react';
import {createPortal} from 'react-dom';
import {useLedger,useToast} from '../context';
import {categories,units,type Material} from '../data/store';
import {errorText} from '../lib';
import {Modal,Button,ErrorMessage} from './ui';
export default function MaterialForm({initialName='',onClose,onSaved}:{initialName?:string;onClose:()=>void;onSaved?:(material:Material)=>void}){
 const {store}=useLedger();const notify=useToast();const [error,setError]=useState('');
 function save(e:FormEvent<HTMLFormElement>){e.preventDefault();e.stopPropagation();const data=new FormData(e.currentTarget);try{const m=store.saveMaterial({name:String(data.get('name')),category:data.get('category') as Material['category'],unit:data.get('unit') as Material['unit']});onSaved?.(m);notify('Material added to the shared catalogue.');onClose();}catch(e){setError(errorText(e));}}
 return createPortal(<Modal title="Add material" subtitle="Available to every vendor and every site." onClose={onClose}><form onSubmit={save}><div className="dialog-body form-grid"><label className="form-field full"><span className="bilingual-label"><span>Material name *</span><span lang="ur" dir="rtl">سامان کا نام</span></span><input name="name" defaultValue={initialName} maxLength={160} required autoFocus/></label><label className="form-field"><span className="bilingual-label"><span>Default unit *</span><span lang="ur" dir="rtl">اکائی</span></span><select name="unit">{units.map(u=><option key={u}>{u}</option>)}</select></label><label className="form-field"><span className="bilingual-label"><span>Category *</span><span lang="ur" dir="rtl">سامان کی قسم</span></span><select name="category">{categories.map(c=><option key={c}>{c}</option>)}</select></label><p className="form-hint full">Include the grade or size where relevant. Rates are entered on each receipt.</p><div className="full"><ErrorMessage error={error}/></div></div><div className="dialog-foot"><Button onClick={onClose}>Cancel</Button><Button type="submit" tone="primary">Add material</Button></div></form></Modal>,document.body);
}
