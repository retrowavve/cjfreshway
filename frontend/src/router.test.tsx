import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routes } from './router';
import { useAuthStore } from './stores/authStore';
import type { TokenPair } from './types';

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

function loginAs(role: 'USER' | 'ADMIN') {
  const tokens: TokenPair = {
    accessToken: makeToken({ sub: 'u1', role, loginId: 'gdhong' }),
    refreshToken: 'refresh-1',
  };
  useAuthStore.getState().login(tokens);
}

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {routes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
  vi.stubGlobal('fetch', vi.fn());
  (fetch as Mock).mockResolvedValue(jsonResponse([], 200));
});

describe('router / ProtectedRoute', () => {
  it('미인증 상태로 "/" 접근 시 로그인 화면으로 리다이렉트된다', async () => {
    renderAt('/');

    expect(await screen.findByRole('heading', { name: '응모해' })).toBeInTheDocument();
  });

  it('USER로 로그인된 상태에서 "/" 접근 시 PromotionList가 렌더된다', async () => {
    loginAs('USER');

    renderAt('/');

    expect(await screen.findByText('프로모션 목록')).toBeInTheDocument();
  });

  it('USER로 로그인된 상태에서 "/admin/promotions" 접근 시 "/"로 리다이렉트된다', async () => {
    loginAs('USER');

    renderAt('/admin/promotions');

    expect(await screen.findByText('프로모션 목록')).toBeInTheDocument();
  });

  it('ADMIN으로 로그인된 상태에서 USER 전용 라우트("/promotions/:id") 접근 시 "/admin/promotions"로 리다이렉트된다', async () => {
    loginAs('ADMIN');

    renderAt('/promotions/p1');

    expect(await screen.findByText('프로모션 관리')).toBeInTheDocument();
  });

  it('role 미지정 라우트("/me")는 로그인만 되어 있으면 정상 렌더된다', async () => {
    loginAs('USER');

    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse(
        { id: 'u1', loginId: 'gdhong', businessName: '테스트상사', name: '홍길동', phone: null, createdAt: '2026-08-01T00:00:00.000Z' },
        200,
      ),
    );

    renderAt('/me');

    expect(await screen.findByRole('heading', { name: '마이페이지' })).toBeInTheDocument();
  });
});
