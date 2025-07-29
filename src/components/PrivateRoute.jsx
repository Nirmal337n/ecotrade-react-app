import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../utils/helpers.js';

/**
 * PrivateRoute component that protects routes requiring authentication
 * Redirects to login page if user is not authenticated
 * Preserves the intended destination for post-login redirect
 */
const PrivateRoute = ({ children }) => {
  const location = useLocation();
  const authenticated = isAuthenticated();
  
  if (!authenticated) {
    // Redirect to login with the current location as state
    // This allows redirecting back after successful login
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }
  
  return children;
};

export default PrivateRoute;