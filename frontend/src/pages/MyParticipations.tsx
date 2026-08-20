import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient, ApiError } from '../api/httpClient';
import type { Participation } from '../types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}
function typeBadgeClass(type: Participation['promotionType']): string {
  return type === 'ROULETTE' ? 'promotion-badge promotion-badge-roulette' : 'promotion-badge';
}

export default function MyParticipations() {
  const queryClient = useQueryClient();
  const { data: participations, isLoading, isError } = useQuery({
    queryKey: ['myParticipations'],
    queryFn: () => httpClient.get<Participation[]>('/me/participations'),
  });

  const cancelMutation = useMutation({
    mutationFn: (participationId: string) =>
      httpClient.patch<Participation>(`/participations/${participationId}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myParticipations'] }),
  });

  const reapplyMutation = useMutation({
    mutationFn: (participationId: string) =>
      httpClient.patch<Participation>(`/participations/${participationId}/reapply`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myParticipations'] }),
  });

  const actionError = cancelMutation.error ?? reapplyMutation.error;

  return (
    <div className="promotion-page myp-page">
      <Link to="/me" className="promotion-back">← 마이페이지</Link>
      <h2 className="promotion-section-title">내 참여내역</h2>

      {(cancelMutation.isError || reapplyMutation.isError) && (
        <p role="alert" className="auth-error">
          {actionError instanceof ApiError ? actionError.message : '요청 처리에 실패했습니다.'}
        </p>
      )}
      {isLoading && <p>불러오는 중...</p>}
      {isError && <p role="alert">참여내역을 불러오지 못했습니다.</p>}

      {participations && (
        <div className="myp-table-wrap">
          <table className="myp-table">
            <thead>
              <tr>
                <th>프로모션</th>
                <th>방식</th>
                <th>상태</th>
                <th>결과</th>
                <th>참여일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {participations.map((p) => {
                const isCancelling = cancelMutation.isPending && cancelMutation.variables === p.id;
                const isReapplying = reapplyMutation.isPending && reapplyMutation.variables === p.id;
                return (
                  <tr key={p.id}>
                    <td>{p.promotionTitle}</td>
                    <td><span className={typeBadgeClass(p.promotionType)}>{p.promotionType}</span></td>
                    <td>{p.status}</td>
                    <td>
                      {p.promotionType === 'ROULETTE' ? (
                        <ul className="myp-attempts">
                          {(p.attempts ?? []).map((a) => (
                            <li key={a.id}>{a.attemptNo}회차: {a.result}</li>
                          ))}
                        </ul>
                      ) : (
                        <span>{p.result}</span>
                      )}
                    </td>
                    <td>{formatDate(p.participatedAt)}</td>
                    <td className="myp-actions">
                      {(p.status === 'APPLIED' || p.status === 'REAPPLIED') && (
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={isCancelling}
                          onClick={() => cancelMutation.mutate(p.id)}
                        >
                          취소
                        </button>
                      )}
                      {p.status === 'CANCELLED' && (
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={isReapplying}
                          onClick={() => reapplyMutation.mutate(p.id)}
                        >
                          재신청
                        </button>
                      )}
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
