import { useEffect, useState, useContext } from 'react';
import { sb } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/form.css';

export default function Iglesias(){
 const { user } = useContext(AuthContext);
 const userRole = user?.user_metadata?.role || 'user';
 const [data,setData]=useState([]);
 const [nombre,setNombre]=useState('');
 const [showInactive,setShowInactive]=useState(false);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const navigate=useNavigate();

 async function load(){
  setError('');
  setLoading(true);
  
  try {
    // Only select existing columns - avoids RLS issues with non-existent user_id
    let query = sb.from('iglesias').select('id,nombre,estado,created_at').order('nombre', { ascending: true });
    if(!showInactive) query = query.eq('estado','activo');
    
    const {data, error: queryError} = await query;
    
    if(queryError) {
      setError('Error cargando iglesias: ' + queryError.message);
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

 async function save(){
  if(userRole !== 'admin' && userRole !== 'superadmin') {
    alert('Solo admin puede crear iglesias');
    return;
  }
  
  setError('');
  
  if(!nombre.trim()) {
    setError('Nombre de iglesia es requerido');
    return;
  }
  
  const {error: saveError} = await sb.from('iglesias').insert([{nombre:nombre.trim(),estado:'activo'}]);
  
  if(saveError) {
    setError('Error guardando iglesia: ' + saveError.message);
    console.error(saveError);
    return;
  }
  
  setNombre('');
  load();
 }

 async function toggleEstado(i){
  setError('');
  const nuevo = i.estado === 'activo' ? 'inactivo' : 'activo';
  
  if(nuevo === 'inactivo'){
    const {data:dep, error: depError} = await sb.from('clubes').select('id').eq('iglesia_id',i.id).eq('estado','activo').limit(1);
    
    if(depError) {
      setError('Error verificando dependencias: ' + depError.message);
      console.error(depError);
      return;
    }
    
    if(dep && dep.length > 0) {
      alert('No se puede desactivar. Tiene clubes activos.');
      return;
    }
  }
  
  const {error: updateError} = await sb.from('iglesias').update({estado:nuevo}).eq('id',i.id);
  
  if(updateError) {
    setError('Error actualizando iglesia: ' + updateError.message);
    console.error(updateError);
    return;
  }
  
  load();
 }

 useEffect(()=>{
  load();
 },[showInactive]);

 return (
  <div className="container">
    <div className="page-header">
      <h1>⛪ Iglesias</h1>
      {userRole === 'admin' || userRole === 'superadmin' ? (
        <span className={`badge badge-${userRole}`}>{userRole}</span>
      ) : null}
    </div>

    {error && <div className="alert alert-error">{error}</div>}
    
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type='checkbox' onChange={e => setShowInactive(e.target.checked)} />
          Mostrar inactivas
        </label>
        
        {(userRole === 'admin' || userRole === 'superadmin') && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input 
              value={nombre} 
              onChange={e => setNombre(e.target.value)} 
              placeholder="Nombre de iglesia"
              className="form-input"
              onKeyPress={e => e.key === 'Enter' && save()}
              style={{ minWidth: '200px' }}
            />
            <button onClick={save} className="btn btn-primary btn-sm">Agregar</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading">Cargando iglesias...</div>
      ) : data.length === 0 ? (
        <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay iglesias registradas</p>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {data.map(i => (
            <div key={i.id} style={{
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
                <strong>{i.nombre}</strong>
                <span className={`badge badge-${i.estado}`} style={{ marginLeft: '10px' }}>
                  {i.estado}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => navigate(`/dashboard/clubes?iglesia=${i.id}`)}
                  className="btn btn-sm btn-edit"
                >
                  📋 Clubes
                </button>
                <button 
                  onClick={() => toggleEstado(i)}
                  className={`btn btn-sm ${i.estado === 'activo' ? 'btn-danger' : 'btn-success'}`}
                >
                  {i.estado === 'activo' ? '❌ Desactivar' : '✓ Activar'}
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
