import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient, ApiError } from '../api/httpClient';
import Gnb from '../components/Gnb';
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
    <>
      <Gnb />
      <div className="promotion-page">
        <div className="admin-list-header">
          <h1 className="promotion-section-title">프로모션 관리</h1>
          <div className="admin-list-header-actions">
            <Link to="/admin/promotions/new" className="btn-primary">+ 신규 등록</Link>
          </div>
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
                    <td><span className={typeBadgeClass(p.type)}>{typeLabel(p.type)}</span></td>
                    <td>{formatPeriod(p.startAt, p.endAt)}</td>
                    <td><span className={statusBadgeClass(p.status)}>{statusLabel(p.status)}</span></td>
                    <td className="myp-actions">
                      <div className="myp-actions-inner">
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
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </>
  );
}
