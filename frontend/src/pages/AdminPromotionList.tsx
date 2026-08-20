import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient, ApiError } from '../api/httpClient';
import type { Promotion } from '../types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}
function formatPeriod(startAt: string, endAt: string): string {
  return `${formatDate(startAt)}~${formatDate(endAt)}`;
}

export default function AdminPromotionList() {
  const queryClient = useQueryClient();
  const { data: promotions, isLoading, isError } = useQuery({
    queryKey: ['adminPromotions'],
    queryFn: () => httpClient.get<Promotion[]>('/admin/promotions'),
  });

  const endMutation = useMutation({
    mutationFn: (promotionId: string) => httpClient.patch<Promotion>(`/admin/promotions/${promotionId}/end`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminPromotions'] }),
  });

  return (
    <div className="promotion-page">
      <div className="admin-list-header">
        <h1 className="promotion-section-title">프로모션 관리</h1>
        <Link to="/admin/promotions/new" className="btn-primary">+ 신규 등록</Link>
      </div>
      {isLoading && <p>불러오는 중...</p>}
      {isError && <p role="alert">프로모션 목록을 불러오지 못했습니다.</p>}
      {endMutation.isError && (
        <p role="alert" className="auth-error">
          {endMutation.error instanceof ApiError ? endMutation.error.message : '조기 종료에 실패했습니다.'}
        </p>
      )}
      {promotions && (
        <div className="myp-table-wrap">
          <table className="myp-table">
            <thead>
              <tr><th>프로모션명</th><th>방식</th><th>기간</th><th>상태</th><th>관리</th></tr>
            </thead>
            <tbody>
              {promotions.map((p) => {
                const isEnding = endMutation.isPending && endMutation.variables === p.id;
                return (
                  <tr key={p.id}>
                    <td>{p.title}</td>
                    <td><span className="promotion-badge">{p.type}</span></td>
                    <td>{formatPeriod(p.startAt, p.endAt)}</td>
                    <td>{p.status}</td>
                    <td className="myp-actions">
                      {p.status === 'ONGOING' && (
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={isEnding}
                          onClick={() => {
                            if (window.confirm('조기 종료하시겠습니까?')) endMutation.mutate(p.id);
                          }}
                        >
                          조기종료
                        </button>
                      )}
                      <Link to={`/admin/promotions/${p.id}/edit`} className="btn-secondary">수정</Link>
                      <Link to={`/admin/promotions/${p.id}/participations`} className="btn-secondary">현황</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
