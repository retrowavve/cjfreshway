import type { ReactElement } from 'react';
import { Navigate, createBrowserRouter, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import PromotionList from './pages/PromotionList';
import PromotionDetail from './pages/PromotionDetail';
import MyParticipations from './pages/MyParticipations';
import MyPage from './pages/MyPage';
import MyInfoEdit from './pages/MyInfoEdit';
import MyPasswordChange from './pages/MyPasswordChange';
import AdminPromotionList from './pages/AdminPromotionList';
import AdminPromotionForm from './pages/AdminPromotionForm';
import AdminParticipationStatus from './pages/AdminParticipationStatus';

export function ProtectedRoute({
  role,
  children,
}: {
  role?: 'USER' | 'ADMIN';
  children: ReactElement;
}) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export const routes = [
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <SignUp /> },
  {
    path: '/',
    element: (
      <ProtectedRoute role="USER">
        <PromotionList />
      </ProtectedRoute>
    ),
  },
  {
    path: '/promotions/:id',
    element: (
      <ProtectedRoute role="USER">
        <PromotionDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: '/me/participations',
    element: (
      <ProtectedRoute role="USER">
        <MyParticipations />
      </ProtectedRoute>
    ),
  },
  {
    path: '/me',
    element: (
      <ProtectedRoute>
        <MyPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/me/info',
    element: (
      <ProtectedRoute>
        <MyInfoEdit />
      </ProtectedRoute>
    ),
  },
  {
    path: '/me/password',
    element: (
      <ProtectedRoute>
        <MyPasswordChange />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/promotions',
    element: (
      <ProtectedRoute role="ADMIN">
        <AdminPromotionList />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/promotions/new',
    element: (
      <ProtectedRoute role="ADMIN">
        <AdminPromotionForm />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/promotions/:id/edit',
    element: (
      <ProtectedRoute role="ADMIN">
        <AdminPromotionForm />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/promotions/:id/participations',
    element: (
      <ProtectedRoute role="ADMIN">
        <AdminParticipationStatus />
      </ProtectedRoute>
    ),
  },
];

export const router = createBrowserRouter(routes);
