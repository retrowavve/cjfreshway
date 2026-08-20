import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { httpClient } from '../api/httpClient';
import { useAuthStore } from '../stores/authStore';
import type { Promotion } from '../types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}
function formatPeriod(startAt: string, endAt: string): string {
  return `${formatDate(startAt)}~${formatDate(endAt)}`;
}
function typeBadgeClass(type: Promotion['type']): string {
  return type === 'ROULETTE' ? 'promotion-badge promotion-badge-roulette' : 'promotion-badge';
}
function statusLabel(status: Promotion['status']): string {
  if (status === 'ONGOING') return '진행중';
  if (status === 'UPCOMING') return '진행예정';
  return '종료';
}
function statusBadgeClass(status: Promotion['status']): string {
  if (status === 'ONGOING') return 'status-badge status-badge-ongoing';
  if (status === 'UPCOMING') return 'status-badge status-badge-upcoming';
  return 'status-badge status-badge-ended';
}

export default function PromotionList() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => httpClient.get<Promotion[]>('/promotions'),
  });

  return (
    <div className="promotion-page">
      <header className="promotion-header">
        <h1>응모해</h1>
        <div className="promotion-header-actions">
          {user && (
            <span className="account-badge">
              <strong>{user.loginId}</strong>
              <span className="account-badge-role">일반회원</span>
            </span>
          )}
          <Link to="/me" className="btn-secondary">마이페이지</Link>
        </div>
      </header>
      <h2 className="promotion-section-title">진행중인 프로모션</h2>
      {isLoading && <p>불러오는 중...</p>}
      {isError && <p role="alert">프로모션을 불러오지 못했습니다.</p>}
      {data && (
        <div className="promotion-grid">
          {data.map((p) => (
            <Link key={p.id} to={`/promotions/${p.id}`} className="promotion-card">
              <span className={typeBadgeClass(p.type)}>{p.type}</span>
              <h3 className="promotion-title">{p.title}</h3>
              <p className="promotion-period">{formatPeriod(p.startAt, p.endAt)}</p>
              <span className={statusBadgeClass(p.status)}>{statusLabel(p.status)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
