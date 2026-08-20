import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { routes } from './router';
import { useAuthStore } from './stores/authStore';
import type { TokenPair } from './types';

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
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        {routes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
});

describe('router / ProtectedRoute', () => {
  it('미인증 상태로 "/" 접근 시 로그인 화면으로 리다이렉트된다', async () => {
    renderAt('/');

    expect(await screen.findByText('Login')).toBeInTheDocument();
  });

  it('USER로 로그인된 상태에서 "/" 접근 시 PromotionList가 렌더된다', async () => {
    loginAs('USER');

    renderAt('/');

    expect(await screen.findByText('PromotionList')).toBeInTheDocument();
  });

  it('USER로 로그인된 상태에서 "/admin/promotions" 접근 시 "/"로 리다이렉트된다', async () => {
    loginAs('USER');

    renderAt('/admin/promotions');

    expect(await screen.findByText('PromotionList')).toBeInTheDocument();
  });

  it('role 미지정 라우트("/me")는 로그인만 되어 있으면 정상 렌더된다', async () => {
    loginAs('USER');

    renderAt('/me');

    expect(await screen.findByText('MyPage')).toBeInTheDocument();
  });
});
