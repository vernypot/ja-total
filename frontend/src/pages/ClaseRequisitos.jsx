import { useEffect, useState } from 'react';
import { sb } from '../services/supabase';
import { useSearchParams } from 'react-router-dom';

export default function ClaseRequisitos(){
 const [data,setData]=useState([]);
 const [desc,setDesc]=useState('');
 const [params]=useSearchParams();
 const claseId=params.get('clase');

 async function load(){
  const {data}=await sb.from('clase_requisitos').select('*').eq('clase_id',claseId);
  setData(data||[]);
 }

 async function save(){
  await sb.from('clase_requisitos').insert([{clase_id:claseId,descripcion:desc}]);
  setDesc(''); load();
 }

 useEffect(()=>{if(claseId) load();},[claseId]);

 return (
  <div>
   <h2>Requisitos</h2>
   <input value={desc} onChange={e=>setDesc(e.target.value)} />
   <button onClick={save}>Agregar</button>
   {data.map(r=>(<div key={r.id}>{r.descripcion}</div>))}
  </div>
 );
}
