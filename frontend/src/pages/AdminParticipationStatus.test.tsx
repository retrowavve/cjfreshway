import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminParticipationStatus from './AdminParticipationStatus';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function renderStatus(id: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/admin/promotions/${id}/participations`]}>
        <Routes>
          <Route path="/admin/promotions/:id/participations" element={<AdminParticipationStatus />} />
          <Route path="/admin/promotions" element={<div>List-Stub</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

describe('AdminParticipationStatus', () => {
  it('DIRECT 프로모션은 WIN/LOSE 카운트 없이 참여자 수와 목록만 표시한다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse(
        {
          totalCount: 3,
          items: [
            {
              participationId: 'pt1',
              businessName: 'OO식당',
              name: '김담당',
              status: 'APPLIED',
              result: 'PENDING',
              participatedAt: '2026-08-10T12:00:00.000Z',
            },
          ],
        },
        200,
      ),
    );

    renderStatus('p1');

    expect(await screen.findByText('총 참여자 수: 3')).toBeInTheDocument();
    expect(screen.getByText('OO식당')).toBeInTheDocument();
    expect(screen.getByText('김담당')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.queryByText(/WIN:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/LOSE:/)).not.toBeInTheDocument();
  });

  it('ROULETTE 프로모션은 WIN/LOSE 카운트를 표시한다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse(
        {
          totalCount: 5,
          winCount: 2,
          loseCount: 3,
          items: [
            {
              participationId: 'pt1',
              businessName: 'OO식당',
              name: '김담당',
              status: 'APPLIED',
              result: 'WIN',
              participatedAt: '2026-08-10T12:00:00.000Z',
            },
          ],
        },
        200,
      ),
    );

    renderStatus('p1');

    expect(await screen.findByText('WIN: 2')).toBeInTheDocument();
    expect(screen.getByText('LOSE: 3')).toBeInTheDocument();
  });

  it('목록으로 가는 링크가 올바른 경로를 가리킨다', async () => {
    (fetch as Mock).mockResolvedValueOnce(jsonResponse({ totalCount: 0, items: [] }, 200));

    renderStatus('p1');
    await screen.findByText('총 참여자 수: 0');

    expect(screen.getByRole('link', { name: '← 목록' }).getAttribute('href')).toBe(
      '/admin/promotions',
    );
  });

  it('존재하지 않는 프로모션이면 에러 메시지를 alert로 표시한다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ code: 'PROMOTION_NOT_FOUND', message: '존재하지 않는 프로모션입니다.' }, 404),
    );

    renderStatus('p1');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('존재하지 않는 프로모션입니다.');
  });
});
