import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { httpClient, ApiError } from '../api/httpClient';
import type { AdminParticipationSummary } from '../types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export default function AdminParticipationStatus() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['adminParticipationSummary', id],
    queryFn: () => httpClient.get<AdminParticipationSummary>(`/admin/promotions/${id}/participations`),
    enabled: !!id,
  });

  return (
    <div className="promotion-page">
      <Link to="/admin/promotions" className="promotion-back">← 목록</Link>
      <h2 className="promotion-section-title">참여 현황</h2>
      {isLoading && <p>불러오는 중...</p>}
      {isError && (
        <p role="alert">{error instanceof ApiError ? error.message : '참여 현황을 불러오지 못했습니다.'}</p>
      )}
      {data && (
        <>
          <div className="admin-summary">
            <span>총 참여자 수: {data.totalCount}</span>
            {data.winCount !== undefined && <span>WIN: {data.winCount}</span>}
            {data.loseCount !== undefined && <span>LOSE: {data.loseCount}</span>}
          </div>
          <div className="myp-table-wrap">
            <table className="myp-table">
              <thead>
                <tr><th>사업체명</th><th>담당자</th><th>상태</th><th>결과</th><th>참여일</th></tr>
              </thead>
              <tbody>
                {data.items.map((it) => (
                  <tr key={it.participationId}>
                    <td>{it.businessName}</td>
                    <td>{it.name}</td>
                    <td>{it.status}</td>
                    <td>{it.result ?? '-'}</td>
                    <td>{formatDate(it.participatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
