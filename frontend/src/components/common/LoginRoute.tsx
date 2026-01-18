// Login Route Component
import { Navigate } from 'react-router-dom';
import { Login } from '../../pages/auth/Login';
import { useAuth } from '../../context/AuthContext';

export const LoginRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <Navigate to="/" replace /> : <Login />;
};


