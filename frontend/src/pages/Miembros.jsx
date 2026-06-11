import { useEffect, useState, useContext } from 'react';
import { sb } from '../services/supabase';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import { IglesiaContext } from '../context/IglesiaContext';
import '../styles/form.css';

export default function Miembros(){
 const { activeIglesia } = useContext(IglesiaContext);
 const [data,setData]=useState([]);
 const [iglesiasData, setIglesiasData]=useState([]);
 const [clubsData, setClubsData]=useState([]);
 const [showInactive,setShowInactive]=useState(false);
 const [params]=useSearchParams();
 const clubId=params.get('club');
 const navigate = useNavigate();
 const [activeIglesiaData, setActiveIglesiaData] = useState(null);

 async function load(){
  let query=sb.from('miembro_club').select('miembros(id,nombre,apellido1,apellido2,estado)');
  if(clubId) query=query.eq('club_id',clubId);
  const {data, error}=await query;
  if(error) {
    console.error('Error loading members:', error);
    setData([]);
    return;
  }
  setData(data||[]);
 }

 async function loadIglesias() {
   const { data: igData } = await sb.from('iglesias').select('id, nombre').eq('estado', 'activo');
   if(igData) {
     setIglesiasData(igData);
     if(activeIglesia) {
       const active = igData.find(i => i.id === activeIglesia);
       if(active) setActiveIglesiaData(active);
     } else if(igData.length > 0) {
       setActiveIglesiaData(igData[0]);
     }
   }
 }

 async function loadClubs() {
   if(activeIglesia) {
     const { data: clubData } = await sb.from('clubes').select('id, nombre').eq('iglesia_id', activeIglesia).eq('estado', 'activo');
     setClubsData(clubData || []);
   }
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
 useEffect(()=>{loadIglesias(); loadClubs();},[activeIglesia]);

 return (
  <div className="container">
    <div className="page-header">
      <div>
        <h1>👥 Miembros</h1>
        {activeIglesiaData && (
          <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
            Church: <strong>{activeIglesiaData.nombre}</strong>
          </p>
        )}
      </div>
      <button 
        onClick={() => navigate('/dashboard/miembro/new')}
        style={{
          padding: '10px 15px',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        ➕ Nuevo Miembro
      </button>
    </div>

    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type='checkbox' onChange={e=>setShowInactive(e.target.checked)} />
            Mostrar inactivos
          </label>
          {clubsData.length > 0 && (
            <select 
              value={clubId || ''} 
              onChange={e => {
                if(e.target.value) {
                  navigate(`/dashboard/miembros?club=${e.target.value}`);
                } else {
                  navigate('/dashboard/miembros');
                }
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Todos los clubes</option>
              {clubsData.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay miembros registrados</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {data.map(x=>{
            const m=x.miembros;
            if(!showInactive && m.estado!=='activo') return null;
            
            const nombreCompleto = [m.nombre, m.apellido1, m.apellido2].filter(Boolean).join(' ');
            
            return (
              <div key={m.id} style={{
                padding: '15px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#fff',
                transition: 'all 0.2s'
              }} className="hover-shadow">
                <div>
                  <strong>{nombreCompleto}</strong>
                  <span className={`badge badge-${m.estado}`} style={{ marginLeft: '10px' }}>
                    {m.estado}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => navigate(`/dashboard/miembro/${m.id}`)}
                    className="btn btn-sm btn-edit"
                  >
                    ✏️ Editar
                  </button>
                  <button 
                    onClick={()=>toggleEstado(m)}
                    className={`btn btn-sm ${m.estado==='activo' ? 'btn-danger' : 'btn-success'}`}
                  >
                    {m.estado==='activo'?'❌ Desactivar':'✓ Activar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
 );
}
