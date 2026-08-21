import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MyInfoEdit from './MyInfoEdit';
import { useAuthStore } from '../stores/authStore';

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

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
      <MemoryRouter initialEntries={['/me/info']}>
        <Routes>
          <Route path="/me/info" element={<MyInfoEdit />} />
          <Route path="/me" element={<div>MyPage-Stub</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const userMe = {
  id: 'u1', loginId: 'gdhong', businessName: '테스트상사', name: '홍길동',
  phone: '010-1234-5678', createdAt: '2026-08-01T00:00:00.000Z',
};
const adminMe = { id: 'a1', loginId: 'admin', name: '관리자', createdAt: '2026-08-01T00:00:00.000Z' };

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
  vi.stubGlobal('fetch', vi.fn());
});

describe('MyInfoEdit', () => {
  it('User 정보 조회 후 폼에 초기값이 채워진다', async () => {
    (fetch as Mock).mockResolvedValueOnce(jsonResponse(userMe, 200));

    renderPage('USER');

    expect(await screen.findByDisplayValue('테스트상사')).toBeInTheDocument();
    expect(screen.getByDisplayValue('홍길동')).toBeInTheDocument();
    expect(screen.getByDisplayValue('010-1234-5678')).toBeInTheDocument();
    expect(screen.getByDisplayValue('gdhong')).toBeDisabled();
  });

  it('정보 수정 후 저장 시 PUT 요청이 가고 화면에 반영된다', async () => {
    (fetch as Mock)
      .mockResolvedValueOnce(jsonResponse(userMe, 200))
      .mockResolvedValueOnce(jsonResponse({ ...userMe, businessName: '새이름상사' }, 200));

    renderPage('USER');

    const businessNameInput = await screen.findByDisplayValue('테스트상사');
    fireEvent.change(businessNameInput, { target: { value: '새이름상사' } });
    fireEvent.click(screen.getByRole('button', { name: '정보 저장' }));

    expect(await screen.findByDisplayValue('새이름상사')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
    const [url, options] = (fetch as Mock).mock.calls[1];
    expect(String(url)).toContain('/me');
    expect(options.method).toBe('PUT');
  });

  it('Admin은 name 필드만 노출되고 businessName/phone 미노출', async () => {
    (fetch as Mock).mockResolvedValueOnce(jsonResponse(adminMe, 200));

    renderPage('ADMIN');

    await screen.findByDisplayValue('관리자');
    expect(screen.queryByLabelText('사업체명')).toBeNull();
    expect(screen.queryByLabelText('연락처')).toBeNull();
    expect(screen.getByLabelText('담당자명')).toBeInTheDocument();
  });
});
