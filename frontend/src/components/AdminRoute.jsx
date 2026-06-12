import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getUserRole, isAdminOrAbove } from '../utils/permissions';

export default function AdminRoute({ element }) {
  const { user, userData, loading } = useContext(AuthContext);

  if (loading) return null;

  const role = getUserRole(user, userData);
  if (!isAdminOrAbove(role)) {
    return <Navigate to="/dashboard/clubes" replace />;
  }

  return element;
}
