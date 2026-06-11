import { useEffect, useState } from 'react';
import { sb } from '../services/supabase';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from "react-router-dom";

export default function Miembros(){
 const [data,setData]=useState([]);
 const [showInactive,setShowInactive]=useState(false);
 const [params]=useSearchParams();
 const clubId=params.get('club');
 const navigate = useNavigate();

 async function load(){
  let query=sb.from('miembro_club').select('miembros(*)');
  if(clubId) query=query.eq('club_id',clubId);
  const {data, error}=await query;
  if(error) {
    console.error('Error loading members:', error);
    setData([]);
    return;
  }
  setData(data||[]);
 }

 async function toggleEstado(m){
  const nuevo=m.estado==='activo'?'inactivo':'activo';
  const {error}=await sb.from('miembros').update({estado:nuevo}).eq('id',m.id);
  if(error) {
    console.error('Error updating member status:', error);
    return alert('Error updating status');
  }
  load();
 }

 useEffect(()=>{load();},[clubId, showInactive]);

 return (
  <div>
   <h2>Miembros</h2>
   <input type='checkbox' onChange={e=>setShowInactive(e.target.checked)} /> Inactivos
   {data.map(x=>{
     const m=x.miembros;
     if(!showInactive && m.estado!=='activo') return null;
     return (
      <div key={m.id}>{m.nombre} [{m.estado}]
       
        <button  onClick={() =>    navigate(`/dashboard/miembro/${m.id}`)}> Ver Detalle</button>

       <button onClick={()=>toggleEstado(m)}>{m.estado==='activo'?'Desactivar':'Activar'}</button>
      </div>
     );
   })}
  </div>
 );
}
