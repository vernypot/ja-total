import { useEffect, useState, useContext } from 'react';
import { sb } from '../services/supabase';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { IglesiaContext } from '../context/IglesiaContext';
import '../styles/form.css';

export default function Clubes(){
 const { activeIglesia } = useContext(IglesiaContext);
 const [data,setData]=useState([]);
 const [iglesiasData, setIglesiasData]=useState([]);
 const [activeIglesiaData, setActiveIglesiaData] = useState(null);
 const [showInactive,setShowInactive]=useState(false);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [params]=useSearchParams();
 const iglesiaId=params.get('iglesia') || activeIglesia;
 const navigate=useNavigate();
 const [showForm, setShowForm] = useState(false);
 const [clubForm, setClubForm] = useState({ nombre: '', iglesia_id: iglesiaId || '', tipo_id: '' });
 const [tipos, setTipos] = useState([]);

 async function loadTipos() {
   const { data: tiposData, error: tiposError } = await sb.from('tipos_club').select('id, nombre');
   if(tiposError) {
     console.error('Error loading club types:', tiposError);
     return;
   }
   setTipos(tiposData || []);
 }

 async function load(){
  setError('');
  setLoading(true);
  
  try {
    let query = sb.from('clubes').select('id,nombre,iglesia_id,estado,created_at,iglesias(id,nombre),tipos_club(nombre)').order('nombre', { ascending: true });
    
    if(iglesiaId) {
      query = query.eq('iglesia_id',iglesiaId);
      // Get the iglesia data
      const { data: igData } = await sb.from('iglesias').select('id,nombre').eq('id', iglesiaId).single();
      if(igData) setActiveIglesiaData(igData);
    }
    
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

 async function loadIglesias() {
   const { data: igData, error } = await sb.from('iglesias').select('id, nombre').eq('estado', 'activo');
   if(!error) {
     setIglesiasData(igData || []);
   }
 }

 async function addClub() {
  setError('');
  
  if(!clubForm.nombre.trim() || !clubForm.iglesia_id) {
    setError('Nombre e iglesia son requeridos');
    return;
  }

  const {error: saveError} = await sb.from('clubes').insert([{
    nombre: clubForm.nombre.trim(),
    iglesia_id: clubForm.iglesia_id,
    tipo_id: clubForm.tipo_id || null,
    estado: 'activo'
  }]);

  if(saveError) {
    setError('Error guardando club: ' + saveError.message);
    console.error(saveError);
    return;
  }

  setClubForm({ nombre: '', iglesia_id: iglesiaId || '', tipo_id: '' });
  setShowForm(false);
  load();
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

 useEffect(()=>{
  load();
  loadTipos();
  loadIglesias();
 },[iglesiaId,showInactive]);

 return (
  <div className="container">
    <div className="page-header">
      <div>
        <h1>🎯 Clubes</h1>
        {activeIglesiaData && (
          <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
            Church: <strong>{activeIglesiaData.nombre}</strong>
          </p>
        )}
      </div>
      <button
        onClick={() => setShowForm(!showForm)}
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
        {showForm ? '✕ Cancelar' : '➕ Nuevo Club'}
      </button>
    </div>

    {error && <div className="alert alert-error">{error}</div>}
    
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type='checkbox' onChange={e => setShowInactive(e.target.checked)} />
          Mostrar inactivos
        </label>
      </div>

      {showForm && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f0f9ff',
          border: '2px solid #0891b2',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4 style={{ marginTop: 0 }}>Agregar Nuevo Club</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nombre</label>
              <input
                type="text"
                value={clubForm.nombre}
                onChange={e => setClubForm({ ...clubForm, nombre: e.target.value })}
                placeholder="Nombre del club"
                className="form-input"
                style={{ margin: 0 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Iglesia</label>
              <select
                value={clubForm.iglesia_id}
                onChange={e => setClubForm({ ...clubForm, iglesia_id: e.target.value })}
                className="form-input"
                style={{ margin: 0 }}
              >
                <option value="">Seleccione iglesia</option>
                {iglesiasData.map(iglesia => (
                  <option key={iglesia.id} value={iglesia.id}>{iglesia.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tipo de Club</label>
              <select
                value={clubForm.tipo_id}
                onChange={e => setClubForm({ ...clubForm, tipo_id: e.target.value })}
                className="form-input"
                style={{ margin: 0 }}
              >
                <option value="">Seleccione tipo</option>
                {tipos.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={addClub}
              style={{
                padding: '10px 20px',
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ✓ Guardar
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ✕ Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Cargando clubes...</div>
      ) : data.length === 0 ? (
        <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>
          No hay clubes registrados
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
