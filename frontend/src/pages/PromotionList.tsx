import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { httpClient } from '../api/httpClient';
import type { Promotion } from '../types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}
function formatPeriod(startAt: string, endAt: string): string {
  return `${formatDate(startAt)}~${formatDate(endAt)}`;
}

export default function PromotionList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => httpClient.get<Promotion[]>('/promotions'),
  });

  return (
    <div className="promotion-page">
      <header className="promotion-header">
        <h1>응모해</h1>
        <Link to="/me">마이페이지</Link>
      </header>
      <h2 className="promotion-section-title">진행중인 프로모션</h2>
      {isLoading && <p>불러오는 중...</p>}
      {isError && <p role="alert">프로모션을 불러오지 못했습니다.</p>}
      {data && (
        <div className="promotion-grid">
          {data.map((p) => (
            <Link key={p.id} to={`/promotions/${p.id}`} className="promotion-card">
              <span className="promotion-badge">{p.type}</span>
              <h3 className="promotion-title">{p.title}</h3>
              <p className="promotion-period">{formatPeriod(p.startAt, p.endAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
