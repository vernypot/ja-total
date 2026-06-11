import { useEffect, useState } from 'react';
import { sb } from '../services/supabase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../styles/form.css';

export default function Clubes(){
 const [data,setData]=useState([]);
 const [showInactive,setShowInactive]=useState(false);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [params]=useSearchParams();
 const iglesiaId=params.get('iglesia');
 const navigate=useNavigate();

 async function load(){
  setError('');
  setLoading(true);
  
  try {
    // Select specific columns to avoid RLS issues
    let query = sb.from('clubes').select('id,nombre,iglesia_id,estado,created_at,iglesias(nombre),tipos_club(nombre)').order('nombre', { ascending: true });
    if(iglesiaId) query = query.eq('iglesia_id',iglesiaId);
    if(!showInactive) query = query.eq('estado','activo');
    
    const {data, error: queryError} = await query;
    
    if(queryError) {
      setError('Error cargando clubes: ' + queryError.message);
      console.error(queryError);
      setData([]);
      setLoading(false);
      return;
    }
    
    setData(data || []);
  } catch (err) {
    setError('Error inesperado: ' + err.message);
    console.error(err);
  } finally {
    setLoading(false);
  }
 }

 async function toggleEstado(c){
  setError('');
  const nuevo = c.estado === 'activo' ? 'inactivo' : 'activo';
  
  if(nuevo === 'inactivo'){
    const {data:dep, error: depError} = await sb.from('miembro_club').select('id').eq('club_id',c.id).limit(1);
    
    if(depError) {
      setError('Error verificando dependencias');
      console.error(depError);
      return;
    }
    
    if(dep && dep.length > 0) {
      alert('No se puede desactivar. Tiene miembros asignados.');
      return;
    }
  }
  
  const {error: updateError} = await sb.from('clubes').update({estado:nuevo}).eq('id',c.id);
  
  if(updateError) {
    setError('Error actualizando club: ' + updateError.message);
    console.error(updateError);
    return;
  }
  
  load();
 }

 useEffect(()=>{load();},[iglesiaId,showInactive]);

 return (
  <div className="container">
    <div className="page-header">
      <h1>🎯 Clubes {iglesiaId && '- ' + data[0]?.iglesias?.nombre}</h1>
    </div>

    {error && <div className="alert alert-error">{error}</div>}
    
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type='checkbox' onChange={e => setShowInactive(e.target.checked)} />
          Mostrar inactivos
        </label>
      </div>

      {loading ? (
        <div className="loading">Cargando clubes...</div>
      ) : data.length === 0 ? (
        <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
          No hay clubes {iglesiaId ? 'en esta iglesia' : 'registrados'}
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {data.map(c => (
            <div key={c.id} style={{
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
                <strong>{c.nombre}</strong>
                <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '4px' }}>
                  {c.tipos_club?.nombre && `Tipo: ${c.tipos_club.nombre}`}
                  {c.iglesias?.nombre && <div>Iglesia: {c.iglesias.nombre}</div>}
                </div>
                <span className={`badge badge-${c.estado}`} style={{ marginTop: '8px', display: 'inline-block' }}>
                  {c.estado}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => navigate(`/dashboard/miembros?club=${c.id}`)}
                  className="btn btn-sm btn-edit"
                >
                  👥 Miembros
                </button>
                <button 
                  onClick={() => toggleEstado(c)}
                  className={`btn btn-sm ${c.estado === 'activo' ? 'btn-danger' : 'btn-success'}`}
                >
                  {c.estado === 'activo' ? '❌ Desactivar' : '✓ Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
 );
}
