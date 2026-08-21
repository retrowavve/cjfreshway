import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { httpClient } from '../api/httpClient';
import Gnb from '../components/Gnb';
import type { Promotion } from '../types';

type StatusFilter = 'ONGOING' | 'UPCOMING';

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
function typeLabel(type: Promotion['type']): string {
  return type === 'ROULETTE' ? '룰렛 돌리기' : '직접 응모';
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
  const [filter, setFilter] = useState<StatusFilter>('ONGOING');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => httpClient.get<Promotion[]>('/promotions'),
  });

  const filtered = data?.filter((p) => p.status === filter) ?? [];

  return (
    <>
      <Gnb />
      <div className="promotion-page">
        <h2 className="promotion-section-title">프로모션 목록</h2>
        <div className="promotion-filter-chips" role="group" aria-label="프로모션 상태 필터">
          <button
            type="button"
            className={`filter-chip filter-chip-ongoing${filter === 'ONGOING' ? ' filter-chip-active' : ''}`}
            onClick={() => setFilter('ONGOING')}
          >
            진행중
          </button>
          <button
            type="button"
            className={`filter-chip filter-chip-upcoming${filter === 'UPCOMING' ? ' filter-chip-active' : ''}`}
            onClick={() => setFilter('UPCOMING')}
          >
            진행예정
          </button>
        </div>
        {isLoading && <p>불러오는 중...</p>}
        {isError && <p role="alert">프로모션을 불러오지 못했습니다.</p>}
        {data && (
          <>
            <div className="promotion-grid">
              {filtered.map((p) => (
                <Link key={p.id} to={`/promotions/${p.id}`} className="promotion-card">
                  <span className={typeBadgeClass(p.type)}>{typeLabel(p.type)}</span>
                  <h3 className="promotion-title">{p.title}</h3>
                  <p className="promotion-period">진행 기간: {formatPeriod(p.startAt, p.endAt)}</p>
                  <span className={statusBadgeClass(p.status)}>{statusLabel(p.status)}</span>
                </Link>
              ))}
            </div>
            {filtered.length === 0 && <p className="promotion-empty">해당 상태의 프로모션이 없습니다.</p>}
          </>
        )}
      </div>
    </>
  );
}
