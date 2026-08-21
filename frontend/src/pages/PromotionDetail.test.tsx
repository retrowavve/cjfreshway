import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PromotionDetail from './PromotionDetail';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function renderDetail(id: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/promotions/${id}`]}>
        <Routes>
          <Route path="/promotions/:id" element={<PromotionDetail />} />
          <Route path="/" element={<div>PromotionList-Stub</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const basePromotion = {
  id: 'p1',
  title: '여름 특가전',
  description: '혜택: 10% 할인',
  startAt: '2026-08-01T12:00:00.000Z',
  endAt: '2026-08-31T12:00:00.000Z',
  status: 'ONGOING',
  createdBy: 'a1',
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

describe('PromotionDetail', () => {
  it('DIRECT 프로모션은 응모하기 버튼만 렌더하고 남은 시도는 표시하지 않는다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ ...basePromotion, type: 'DIRECT', maxParticipationCount: 1 }, 200),
    );

    renderDetail('p1');

    expect(await screen.findByText('여름 특가전')).toBeInTheDocument();
    expect(screen.getByText('혜택: 10% 할인')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '응모하기' })).toBeInTheDocument();
    expect(screen.queryByText(/남은 시도/)).not.toBeInTheDocument();
  });

  it('ENDED 상태의 DIRECT 프로모션은 응모하기 버튼을 렌더하지 않는다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ ...basePromotion, type: 'DIRECT', status: 'ENDED', maxParticipationCount: 1 }, 200),
    );

    renderDetail('p1');

    await screen.findByText('여름 특가전');
    expect(screen.queryByRole('button', { name: '응모하기' })).not.toBeInTheDocument();
  });

  it('ENDED 상태의 ROULETTE 프로모션은 잔여 시도가 있어도 룰렛 실행하기 버튼을 렌더하지 않는다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ ...basePromotion, type: 'ROULETTE', status: 'ENDED', maxParticipationCount: 3, myAttemptCount: 1 }, 200),
    );

    renderDetail('p1');

    await screen.findByText('남은 시도: 2/3회');
    expect(screen.queryByRole('button', { name: '룰렛 실행하기' })).not.toBeInTheDocument();
  });

  it('ROULETTE 프로모션은 잔여 시도 횟수와 룰렛 실행하기 버튼을 렌더한다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse(
        { ...basePromotion, type: 'ROULETTE', maxParticipationCount: 3, myAttemptCount: 1 },
        200,
      ),
    );

    renderDetail('p1');

    expect(await screen.findByText('남은 시도: 2/3회')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '룰렛 실행하기' })).toBeInTheDocument();
  });

  it('myAttemptCount가 없는 경우 잔여 시도는 최대 횟수로 표시된다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ ...basePromotion, type: 'ROULETTE', maxParticipationCount: 3 }, 200),
    );

    renderDetail('p1');

    expect(await screen.findByText('남은 시도: 3/3회')).toBeInTheDocument();
  });

  it('존재하지 않는 프로모션이면 404 에러 메시지를 alert로 렌더한다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse(
        { code: 'PROMOTION_NOT_FOUND', message: '존재하지 않는 프로모션입니다.' },
        404,
      ),
    );

    renderDetail('p1');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('존재하지 않는 프로모션입니다.');
  });

  it('뒤로 가기 링크 클릭 시 목록 화면으로 이동한다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ ...basePromotion, type: 'DIRECT', maxParticipationCount: 1 }, 200),
    );

    renderDetail('p1');
    await screen.findByText('여름 특가전');

    fireEvent.click(screen.getByRole('link', { name: '← 뒤로' }));

    expect(await screen.findByText('PromotionList-Stub')).toBeInTheDocument();
  });

  it('DIRECT 응모 성공 시 응모 완료(PENDING)가 표시된다', async () => {
    (fetch as Mock)
      .mockResolvedValueOnce(jsonResponse({ ...basePromotion, type: 'DIRECT', maxParticipationCount: 1 }, 200))
      .mockResolvedValueOnce(jsonResponse({ id: 'part1', userId: 'u1', promotionId: 'p1', status: 'APPLIED', participatedAt: '2026-08-10T00:00:00.000Z', updatedAt: '2026-08-10T00:00:00.000Z', attemptCount: 1, result: 'PENDING' }, 201));

    renderDetail('p1');
    fireEvent.click(await screen.findByRole('button', { name: '응모하기' }));

    expect(await screen.findByText('응모 완료 (PENDING)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '응모하기' })).not.toBeInTheDocument();
  });

  it('DIRECT 중복 응모 시도 시 거부 사유가 화면에 표시된다', async () => {
    (fetch as Mock)
      .mockResolvedValueOnce(jsonResponse({ ...basePromotion, type: 'DIRECT', maxParticipationCount: 1 }, 200))
      .mockResolvedValueOnce(jsonResponse({ code: 'DUPLICATE_PARTICIPATION', message: '이미 참여한 프로모션입니다.' }, 409));

    renderDetail('p1');
    fireEvent.click(await screen.findByRole('button', { name: '응모하기' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('이미 참여한 프로모션입니다.');
  });

  it('룰렛 실행 후 결과와 회차, 잔여 횟수가 표시된다', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    (fetch as Mock)
      .mockResolvedValueOnce(jsonResponse({ ...basePromotion, type: 'ROULETTE', maxParticipationCount: 3, myAttemptCount: 1 }, 200))
      .mockResolvedValueOnce(jsonResponse({ participationId: 'part1', attemptNo: 2, result: 'WIN', attemptCount: 2, maxParticipationCount: 3 }, 201));

    renderDetail('p1');
    fireEvent.click(await screen.findByRole('button', { name: '룰렛 실행하기' }));

    expect(await screen.findByText('WIN')).toBeInTheDocument();
    expect(screen.getByText('이번 시도(2회차) 결과입니다')).toBeInTheDocument();
    expect(screen.getByText('남은 시도: 1/3회')).toBeInTheDocument();
    expect(screen.getByText('🎉 축하합니다! 당첨되셨습니다! 🎉')).toBeInTheDocument();
    expect(alertSpy).toHaveBeenCalledWith('🎉 축하합니다! 당첨되셨습니다! 🎉');
  });

  it('초기 로드 시 잔여 횟수가 0이면 룰렛 실행 버튼이 노출되지 않는다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ ...basePromotion, type: 'ROULETTE', maxParticipationCount: 3, myAttemptCount: 3 }, 200),
    );

    renderDetail('p1');
    await screen.findByText('남은 시도: 0/3회');

    expect(screen.queryByRole('button', { name: /룰렛 실행하기|다시 돌리기/ })).not.toBeInTheDocument();
  });

  it('룰렛 실행 후 잔여 횟수가 0이 되면 실행 버튼이 사라진다', async () => {
    (fetch as Mock)
      .mockResolvedValueOnce(jsonResponse({ ...basePromotion, type: 'ROULETTE', maxParticipationCount: 3, myAttemptCount: 2 }, 200))
      .mockResolvedValueOnce(jsonResponse({ participationId: 'part1', attemptNo: 3, result: 'LOSE', attemptCount: 3, maxParticipationCount: 3 }, 201));

    renderDetail('p1');
    fireEvent.click(await screen.findByRole('button', { name: '룰렛 실행하기' }));

    await screen.findByText('남은 시도: 0/3회');
    expect(screen.queryByRole('button', { name: /룰렛 실행하기|다시 돌리기/ })).not.toBeInTheDocument();
  });

  it('참여 요청 중 중복 클릭으로 2건이 생성되지 않는다', async () => {
    let resolveParticipate!: (v: Response) => void;
    const participatePromise = new Promise<Response>((resolve) => { resolveParticipate = resolve; });

    (fetch as Mock)
      .mockResolvedValueOnce(jsonResponse({ ...basePromotion, type: 'DIRECT', maxParticipationCount: 1 }, 200))
      .mockImplementationOnce(() => participatePromise);

    renderDetail('p1');
    const button = await screen.findByRole('button', { name: '응모하기' });

    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    fireEvent.click(button);

    resolveParticipate(jsonResponse({ id: 'part1', userId: 'u1', promotionId: 'p1', status: 'APPLIED', participatedAt: '2026-08-10T00:00:00.000Z', updatedAt: '2026-08-10T00:00:00.000Z', attemptCount: 1, result: 'PENDING' }, 201));
    await screen.findByText('응모 완료 (PENDING)');

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
