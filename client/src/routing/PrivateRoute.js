// client/src/routing/PrivateRoute.js
import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, loading } = useContext(AuthContext);
  if (loading) { return <div>Loading Authentication...</div>; }
  if (!isAuthenticated) { return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />; }
  return children;
};
export default PrivateRoute;