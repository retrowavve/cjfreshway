import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PromotionList from './PromotionList';
import { useAuthStore } from '../stores/authStore';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function base64url(json: unknown): string {
  const base64 = btoa(JSON.stringify(json));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function makeToken(payload: Record<string, unknown>): string {
  return `header.${base64url(payload)}.signature`;
}

function renderList() {
  useAuthStore.getState().login({
    accessToken: makeToken({ sub: 'u1', role: 'USER', loginId: 'gdhong' }),
    refreshToken: 'r1',
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<PromotionList />} />
          <Route path="/promotions/:id" element={<div>PromotionDetail-Stub</div>} />
          <Route path="/me" element={<div>MyPage-Stub</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const samplePromotion = {
  id: 'p1',
  title: '여름 특가전',
  type: 'DIRECT',
  description: '설명',
  startAt: '2026-08-01T12:00:00.000Z',
  endAt: '2026-08-31T12:00:00.000Z',
  status: 'ONGOING',
  maxParticipationCount: 1,
  createdBy: 'a1',
};

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
  vi.stubGlobal('fetch', vi.fn());
});

describe('PromotionList', () => {
  it('프로모션 목록을 불러와 카드로 렌더한다', async () => {
    (fetch as Mock).mockResolvedValueOnce(jsonResponse([samplePromotion], 200));

    renderList();

    expect(await screen.findByText('여름 특가전')).toBeInTheDocument();
    expect(screen.getByText('DIRECT')).toBeInTheDocument();
    expect(screen.getByText('08/01~08/31')).toBeInTheDocument();
  });

  it('프로모션 카드 클릭 시 상세 화면으로 이동한다', async () => {
    (fetch as Mock).mockResolvedValueOnce(jsonResponse([samplePromotion], 200));

    renderList();
    await screen.findByText('여름 특가전');

    fireEvent.click(screen.getByRole('link', { name: /여름 특가전/ }));

    expect(await screen.findByText('PromotionDetail-Stub')).toBeInTheDocument();
  });

  it('마이페이지 링크는 /me로 연결된다', async () => {
    (fetch as Mock).mockResolvedValueOnce(jsonResponse([samplePromotion], 200));

    renderList();

    expect(screen.getByRole('link', { name: '마이페이지' })).toHaveAttribute('href', '/me');
  });

  it('목록 조회 실패 시 alert 메시지를 렌더한다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ code: 'INTERNAL_ERROR', message: '서버 오류' }, 500),
    );

    renderList();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
