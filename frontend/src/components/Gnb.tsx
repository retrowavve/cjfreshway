import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Gnb() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    useAuthStore.getState().logout();
    navigate('/login');
  }

  return (
    <header className="gnb">
      <Link to={user!.role === 'ADMIN' ? '/admin/promotions' : '/'} className="gnb-brand">
        <span aria-hidden="true">🎯</span> 응모해
      </Link>
      <div className="gnb-actions">
        <span className="account-badge">
          <strong>{user!.loginId}</strong>
          <span className="account-badge-role">{user!.role === 'ADMIN' ? '관리자' : '일반회원'}</span>
        </span>
        <Link to="/me" className="btn-secondary">마이페이지</Link>
        <button type="button" className="btn-secondary" onClick={handleLogout}>로그아웃</button>
      </div>
    </header>
  );
}
