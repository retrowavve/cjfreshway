import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { httpClient, ApiError } from '../api/httpClient';
import Gnb from '../components/Gnb';
import type { Participation, Promotion, RouletteResult } from '../types';

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

export default function PromotionDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: promotion, isLoading, isError, error } = useQuery({
    queryKey: ['promotion', id],
    queryFn: () => httpClient.get<Promotion>(`/promotions/${id}`),
    enabled: !!id,
  });

  const [directResult, setDirectResult] = useState<'APPLIED' | null>(null);
  const [rouletteResult, setRouletteResult] = useState<RouletteResult | null>(null);

  const applyMutation = useMutation({
    mutationFn: () => httpClient.post<Participation>(`/promotions/${id}/participate`),
    onSuccess: () => setDirectResult('APPLIED'),
  });

  const rouletteMutation = useMutation({
    mutationFn: () => httpClient.post<RouletteResult>(`/promotions/${id}/roulette`),
    onSuccess: (data) => {
      setRouletteResult(data);
      if (data.result === 'WIN') {
        window.alert('🎉 축하합니다! 당첨되셨습니다! 🎉');
      }
    },
  });

  const maxCount = promotion?.maxParticipationCount ?? 0;
  const currentAttemptCount = rouletteResult ? rouletteResult.attemptCount : (promotion?.myAttemptCount ?? 0);
  const remaining = maxCount - currentAttemptCount;
  const isOngoing = promotion?.status === 'ONGOING';
  const canApply = isOngoing && directResult !== 'APPLIED';
  const canRoulette = isOngoing && remaining > 0;

  return (
    <>
      <Gnb />
      <div className="promotion-page promotion-detail">
      <Link to="/" className="promotion-back">← 뒤로</Link>
      {isLoading && <p>불러오는 중...</p>}
      {isError && (
        <p role="alert">
          {error instanceof ApiError ? error.message : '프로모션을 불러오지 못했습니다.'}
        </p>
      )}
      {promotion && (
        <div className="promotion-detail-layout">
          <div className="promotion-detail-body">
            <div className="promotion-detail-header">
              <span className={typeBadgeClass(promotion.type)}>{promotion.type}</span>
              <span className={statusBadgeClass(promotion.status)}>{statusLabel(promotion.status)}</span>
              <h2 className="promotion-title">{promotion.title}</h2>
              <p className="promotion-period">기간: {formatPeriod(promotion.startAt, promotion.endAt)}</p>
            </div>
            <div className="promotion-description-box">
              <p className="promotion-description">{promotion.description}</p>
            </div>
          </div>
          <div className="promotion-detail-action">
            {promotion.type === 'DIRECT' && (
              <>
                {directResult === 'APPLIED' ? (
                  <p className="promotion-result-pending">응모 완료 (PENDING)</p>
                ) : canApply ? (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={applyMutation.isPending}
                    onClick={() => applyMutation.mutate()}
                  >
                    응모하기
                  </button>
                ) : null}
                {applyMutation.isError && (
                  <p role="alert" className="auth-error">
                    {applyMutation.error instanceof ApiError ? applyMutation.error.message : '응모에 실패했습니다.'}
                  </p>
                )}
              </>
            )}
            {promotion.type === 'ROULETTE' && (
              <>
                <p className="promotion-remaining">남은 시도: {remaining}/{maxCount}회</p>
                {rouletteResult && (
                  <div className="roulette-result-card">
                    {rouletteResult.result === 'WIN' && (
                      <p className="roulette-congrats">🎉 축하합니다! 당첨되셨습니다! 🎉</p>
                    )}
                    <p className="roulette-result-label">🎯 결과</p>
                    <p className={rouletteResult.result === 'WIN' ? 'roulette-result-win' : 'roulette-result-lose'}>
                      {rouletteResult.result}
                    </p>
                    <p className="promotion-remaining">이번 시도({rouletteResult.attemptNo}회차) 결과입니다</p>
                    <Link to="/me/participations" className="promotion-back">참여내역으로 보기</Link>
                  </div>
                )}
                {canRoulette && (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={rouletteMutation.isPending}
                    onClick={() => rouletteMutation.mutate()}
                  >
                    {rouletteMutation.isPending && <span className="roulette-spinner" role="status" aria-label="룰렛 진행 중" />}
                    {rouletteMutation.isPending ? '룰렛 진행 중...' : rouletteResult ? '다시 돌리기' : '룰렛 실행하기'}
                  </button>
                )}
                {rouletteMutation.isError && (
                  <p role="alert" className="auth-error">
                    {rouletteMutation.error instanceof ApiError ? rouletteMutation.error.message : '룰렛 실행에 실패했습니다.'}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  );
}
