import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminPromotionList from './AdminPromotionList';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function renderList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/promotions']}>
        <Routes>
          <Route path="/admin/promotions" element={<AdminPromotionList />} />
          <Route path="/admin/promotions/new" element={<div>Form-Stub</div>} />
          <Route path="/admin/promotions/:id/edit" element={<div>Edit-Stub</div>} />
          <Route path="/admin/promotions/:id/participations" element={<div>Status-Stub</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const samplePromotions = [
  {
    id: 'p1',
    title: '예정 이벤트',
    type: 'DIRECT',
    description: 'd',
    startAt: '2026-09-01T12:00:00.000Z',
    endAt: '2026-09-30T12:00:00.000Z',
    status: 'UPCOMING',
    maxParticipationCount: 1,
    createdBy: 'a1',
  },
  {
    id: 'p2',
    title: '진행 이벤트',
    type: 'DIRECT',
    description: 'd',
    startAt: '2026-08-01T12:00:00.000Z',
    endAt: '2026-08-31T12:00:00.000Z',
    status: 'ONGOING',
    maxParticipationCount: 1,
    createdBy: 'a1',
  },
  {
    id: 'p3',
    title: '종료 이벤트',
    type: 'ROULETTE',
    description: 'd',
    startAt: '2026-07-01T12:00:00.000Z',
    endAt: '2026-07-31T12:00:00.000Z',
    status: 'ENDED',
    maxParticipationCount: 3,
    createdBy: 'a1',
  },
];

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

describe('AdminPromotionList', () => {
  it('전체 프로모션 목록을 렌더한다', async () => {
    (fetch as Mock).mockResolvedValueOnce(jsonResponse(samplePromotions, 200));

    renderList();

    expect(await screen.findByText('예정 이벤트')).toBeInTheDocument();
    expect(screen.getByText('진행 이벤트')).toBeInTheDocument();
    expect(screen.getByText('종료 이벤트')).toBeInTheDocument();
    expect(screen.getAllByText('DIRECT')).toHaveLength(2);
    expect(screen.getByText('ROULETTE')).toBeInTheDocument();
    expect(screen.getByText('09/01~09/30')).toBeInTheDocument();
    expect(screen.getByText('08/01~08/31')).toBeInTheDocument();
    expect(screen.getByText('07/01~07/31')).toBeInTheDocument();
  });

  it('신규 등록 링크가 올바른 경로를 가리킨다', async () => {
    (fetch as Mock).mockResolvedValueOnce(jsonResponse(samplePromotions, 200));

    renderList();
    await screen.findByText('예정 이벤트');

    const link = screen.getByRole('link', { name: '+ 신규 등록' });
    expect(link.getAttribute('href')).toBe('/admin/promotions/new');
  });

  it('ONGOING 프로모션에만 조기종료 버튼이 노출된다', async () => {
    (fetch as Mock).mockResolvedValueOnce(jsonResponse(samplePromotions, 200));

    renderList();
    await screen.findByText('예정 이벤트');

    expect(screen.getAllByRole('button', { name: '조기종료' })).toHaveLength(1);
  });

  it('조기종료 승인 시 PATCH 호출 후 목록을 재조회한다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (fetch as Mock)
      .mockResolvedValueOnce(jsonResponse(samplePromotions, 200))
      .mockResolvedValueOnce(jsonResponse({ ...samplePromotions[1], status: 'ENDED' }, 200))
      .mockResolvedValueOnce(
        jsonResponse(
          [samplePromotions[0], { ...samplePromotions[1], status: 'ENDED' }, samplePromotions[2]],
          200,
        ),
      );

    renderList();
    await screen.findByText('예정 이벤트');
    fireEvent.click(screen.getByRole('button', { name: '조기종료' }));

    await waitFor(() =>
      expect(screen.queryAllByRole('button', { name: '조기종료' })).toHaveLength(0),
    );
  });

  it('조기종료 취소 시 PATCH를 호출하지 않는다', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    (fetch as Mock).mockResolvedValueOnce(jsonResponse(samplePromotions, 200));

    renderList();
    await screen.findByText('예정 이벤트');
    fireEvent.click(screen.getByRole('button', { name: '조기종료' }));

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('수정/현황 링크가 올바른 경로를 가리킨다', async () => {
    (fetch as Mock).mockResolvedValueOnce(jsonResponse(samplePromotions, 200));

    renderList();
    const row = (await screen.findByText('진행 이벤트')).closest('tr') as HTMLElement;

    expect(within(row).getByRole('link', { name: '수정' }).getAttribute('href')).toBe(
      '/admin/promotions/p2/edit',
    );
    expect(within(row).getByRole('link', { name: '현황' }).getAttribute('href')).toBe(
      '/admin/promotions/p2/participations',
    );
  });
});
