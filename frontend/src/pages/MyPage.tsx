import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Gnb from '../components/Gnb';

export default function MyPage() {
  const role = useAuthStore((s) => s.user?.role);

  return (
    <>
      <Gnb />
      <div className="promotion-page mypage-page">
        <div className="mypage-title-row">
          <h1 className="promotion-section-title">마이페이지</h1>
          <span className="account-badge-role">{role === 'ADMIN' ? '관리자' : '일반회원'}</span>
        </div>
        <nav className="mypage-menu">
          <Link to="/me/info" className="mypage-menu-item">개인정보 수정</Link>
          <Link to="/me/password" className="mypage-menu-item">비밀번호 변경</Link>
          {role === 'USER' && (
            <Link to="/me/participations" className="mypage-menu-item">내 참여내역 보기</Link>
          )}
        </nav>
      </div>
    </>
  );
}
