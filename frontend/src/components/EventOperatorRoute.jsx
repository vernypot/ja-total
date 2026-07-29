import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getUserRole, canOperateEvents } from '../utils/permissions';
import { DASHBOARD_HOME_PATH } from '../utils/dashboardRoutes';

export default function EventOperatorRoute({ element }) {
  const { user, userData, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loading">…</div>
      </div>
    );
  }

  const role = getUserRole(user, userData);
  if (!canOperateEvents(role)) {
    return <Navigate to={DASHBOARD_HOME_PATH} replace />;
  }

  return element;
}
