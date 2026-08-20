import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MyParticipations from './MyParticipations';

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/me/participations']}>
        <Routes>
          <Route path="/me/participations" element={<MyParticipations />} />
          <Route path="/me" element={<div>MyPage-Stub</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

describe('MyParticipations', () => {
  it('목록을 렌더한다', async () => {
    (fetch as unknown as Mock).mockResolvedValueOnce(
      jsonResponse([
        {
          id: 'part1',
          userId: 'u1',
          promotionId: 'p1',
          promotionTitle: '여름 특가전',
          promotionType: 'DIRECT',
          status: 'APPLIED',
          participatedAt: '2026-08-10T12:00:00.000Z',
          updatedAt: '2026-08-10T12:00:00.000Z',
          attemptCount: 1,
          result: 'PENDING',
        },
        {
          id: 'part2',
          userId: 'u1',
          promotionId: 'p2',
          promotionTitle: '룰렛이벤트',
          promotionType: 'ROULETTE',
          status: 'APPLIED',
          participatedAt: '2026-08-11T12:00:00.000Z',
          updatedAt: '2026-08-11T12:00:00.000Z',
          attemptCount: 2,
          result: null,
          attempts: [
            { id: 'att1', participationId: 'part2', attemptNo: 1, result: 'LOSE', attemptedAt: '2026-08-11T12:00:00.000Z' },
            { id: 'att2', participationId: 'part2', attemptNo: 2, result: 'WIN', attemptedAt: '2026-08-11T12:00:00.000Z' },
          ],
        },
      ]),
    );

    renderPage();

    expect(await screen.findByText('여름 특가전')).toBeInTheDocument();
    expect(screen.getByText('룰렛이벤트')).toBeInTheDocument();
    expect(screen.getByText('DIRECT')).toBeInTheDocument();
    expect(screen.getByText('ROULETTE')).toBeInTheDocument();
    expect(screen.getByText('08/10')).toBeInTheDocument();
    expect(screen.getByText('08/11')).toBeInTheDocument();
  });

  it('ROULETTE 항목은 회차별 결과를 표시한다', async () => {
    (fetch as unknown as Mock).mockResolvedValueOnce(
      jsonResponse([
        {
          id: 'part1',
          userId: 'u1',
          promotionId: 'p1',
          promotionTitle: '여름 특가전',
          promotionType: 'DIRECT',
          status: 'APPLIED',
          participatedAt: '2026-08-10T12:00:00.000Z',
          updatedAt: '2026-08-10T12:00:00.000Z',
          attemptCount: 1,
          result: 'PENDING',
        },
        {
          id: 'part2',
          userId: 'u1',
          promotionId: 'p2',
          promotionTitle: '룰렛이벤트',
          promotionType: 'ROULETTE',
          status: 'APPLIED',
          participatedAt: '2026-08-11T12:00:00.000Z',
          updatedAt: '2026-08-11T12:00:00.000Z',
          attemptCount: 2,
          result: null,
          attempts: [
            { id: 'att1', participationId: 'part2', attemptNo: 1, result: 'LOSE', attemptedAt: '2026-08-11T12:00:00.000Z' },
            { id: 'att2', participationId: 'part2', attemptNo: 2, result: 'WIN', attemptedAt: '2026-08-11T12:00:00.000Z' },
          ],
        },
      ]),
    );

    renderPage();

    expect(await screen.findByText('1회차: LOSE')).toBeInTheDocument();
    expect(screen.getByText('2회차: WIN')).toBeInTheDocument();
  });

  it('DIRECT 항목은 PENDING 결과를 표시한다', async () => {
    (fetch as unknown as Mock).mockResolvedValueOnce(
      jsonResponse([
        {
          id: 'part1',
          userId: 'u1',
          promotionId: 'p1',
          promotionTitle: '여름 특가전',
          promotionType: 'DIRECT',
          status: 'APPLIED',
          participatedAt: '2026-08-10T12:00:00.000Z',
          updatedAt: '2026-08-10T12:00:00.000Z',
          attemptCount: 1,
          result: 'PENDING',
        },
      ]),
    );

    renderPage();

    expect(await screen.findByText('PENDING')).toBeInTheDocument();
  });

  it('취소 클릭 시 CANCELLED로 갱신된다', async () => {
    const base = {
      id: 'part1',
      userId: 'u1',
      promotionId: 'p1',
      promotionTitle: '여름 특가전',
      promotionType: 'DIRECT' as const,
      participatedAt: '2026-08-10T12:00:00.000Z',
      updatedAt: '2026-08-10T12:00:00.000Z',
      attemptCount: 1,
      result: 'PENDING' as const,
    };

    (fetch as unknown as Mock)
      .mockResolvedValueOnce(jsonResponse([{ ...base, status: 'APPLIED' }]))
      .mockResolvedValueOnce(jsonResponse({ ...base, status: 'CANCELLED' }, 200))
      .mockResolvedValueOnce(jsonResponse([{ ...base, status: 'CANCELLED' }]));

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '취소' }));

    expect(await screen.findByText('CANCELLED')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('재신청 클릭 시 REAPPLIED로 갱신되고 attempts가 유지된다', async () => {
    const attempts = [
      { id: 'att1', participationId: 'part2', attemptNo: 1, result: 'LOSE', attemptedAt: '2026-08-11T12:00:00.000Z' },
      { id: 'att2', participationId: 'part2', attemptNo: 2, result: 'WIN', attemptedAt: '2026-08-11T12:00:00.000Z' },
    ];
    const base = {
      id: 'part2',
      userId: 'u1',
      promotionId: 'p2',
      promotionTitle: '룰렛이벤트',
      promotionType: 'ROULETTE' as const,
      participatedAt: '2026-08-11T12:00:00.000Z',
      updatedAt: '2026-08-11T12:00:00.000Z',
      attemptCount: 2,
      result: null,
      attempts,
    };

    (fetch as unknown as Mock)
      .mockResolvedValueOnce(jsonResponse([{ ...base, status: 'CANCELLED' }]))
      .mockResolvedValueOnce(jsonResponse({ ...base, status: 'REAPPLIED' }, 200))
      .mockResolvedValueOnce(jsonResponse([{ ...base, status: 'REAPPLIED' }]));

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '재신청' }));

    expect(await screen.findByText('REAPPLIED')).toBeInTheDocument();
    expect(screen.getByText('1회차: LOSE')).toBeInTheDocument();
    expect(screen.getByText('2회차: WIN')).toBeInTheDocument();
  });

  it('상태에 따라 알맞은 액션 버튼만 노출한다', async () => {
    const base = {
      userId: 'u1',
      promotionId: 'p1',
      promotionTitle: '여름 특가전',
      promotionType: 'DIRECT' as const,
      participatedAt: '2026-08-10T12:00:00.000Z',
      updatedAt: '2026-08-10T12:00:00.000Z',
      attemptCount: 1,
      result: 'PENDING' as const,
    };

    (fetch as unknown as Mock).mockResolvedValueOnce(
      jsonResponse([
        { ...base, id: 'part1', status: 'APPLIED' },
        { ...base, id: 'part2', status: 'REAPPLIED' },
        { ...base, id: 'part3', status: 'CANCELLED' },
      ]),
    );

    renderPage();

    await screen.findAllByText('여름 특가전');
    expect(screen.getAllByRole('button', { name: '취소' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: '재신청' })).toHaveLength(1);
  });

  it('필터 없이 모든 항목이 렌더된다', async () => {
    const base = {
      userId: 'u1',
      promotionId: 'p1',
      promotionTitle: '여름 특가전',
      participatedAt: '2026-08-10T12:00:00.000Z',
      updatedAt: '2026-08-10T12:00:00.000Z',
      attemptCount: 1,
    };

    (fetch as unknown as Mock).mockResolvedValueOnce(
      jsonResponse([
        { ...base, id: 'part1', promotionType: 'DIRECT', status: 'APPLIED', result: 'PENDING' },
        { ...base, id: 'part2', promotionType: 'ROULETTE', status: 'CANCELLED', result: null, attempts: [] },
        { ...base, id: 'part3', promotionType: 'DIRECT', status: 'REAPPLIED', result: 'PENDING' },
      ]),
    );

    renderPage();

    await screen.findAllByText('여름 특가전');
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });

  it('취소 실패 시 에러 메시지를 표시한다', async () => {
    const base = {
      id: 'part1',
      userId: 'u1',
      promotionId: 'p1',
      promotionTitle: '여름 특가전',
      promotionType: 'DIRECT' as const,
      status: 'APPLIED' as const,
      participatedAt: '2026-08-10T12:00:00.000Z',
      updatedAt: '2026-08-10T12:00:00.000Z',
      attemptCount: 1,
      result: 'PENDING' as const,
    };

    (fetch as unknown as Mock)
      .mockResolvedValueOnce(jsonResponse([base]))
      .mockResolvedValueOnce(
        jsonResponse({ code: 'INVALID_STATUS_TRANSITION', message: '취소할 수 없는 상태입니다.' }, 409),
      );

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '취소' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('취소할 수 없는 상태입니다.');
  });
});
