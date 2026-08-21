import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MyPage from './MyPage';
import { useAuthStore } from '../stores/authStore';

function base64url(json: unknown): string {
  const base64 = btoa(JSON.stringify(json));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function makeToken(payload: Record<string, unknown>): string {
  return `header.${base64url(payload)}.signature`;
}

function renderPage(role: 'USER' | 'ADMIN') {
  useAuthStore.getState().login({
    accessToken: makeToken({ sub: 'u1', role, loginId: 'gdhong' }),
    refreshToken: 'r1',
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/me']}>
        <Routes>
          <Route path="/me" element={<MyPage />} />
          <Route path="/me/info" element={<div>MyInfoEdit-Stub</div>} />
          <Route path="/me/password" element={<div>MyPasswordChange-Stub</div>} />
          <Route path="/me/participations" element={<div>MyParticipations-Stub</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
  vi.stubGlobal('fetch', vi.fn());
});

describe('MyPage', () => {
  it('User에게는 개인정보 수정, 비밀번호 변경, 참여내역 메뉴가 모두 노출된다', () => {
    renderPage('USER');

    expect(screen.getByRole('link', { name: '프로모션 목록으로 이동' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '개인정보 수정' })).toHaveAttribute('href', '/me/info');
    expect(screen.getByRole('link', { name: '비밀번호 변경' })).toHaveAttribute('href', '/me/password');
    expect(screen.getByRole('link', { name: '내 참여내역 보기' })).toHaveAttribute('href', '/me/participations');
  });

  it('Admin에게는 참여내역 메뉴가 노출되지 않는다', () => {
    renderPage('ADMIN');

    expect(screen.getByRole('link', { name: '개인정보 수정' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '비밀번호 변경' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '내 참여내역 보기' })).toBeNull();
  });
});
