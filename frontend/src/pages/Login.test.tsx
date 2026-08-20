import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from './Login';
import { useAuthStore } from '../stores/authStore';

function base64url(json: unknown): string {
  const base64 = btoa(JSON.stringify(json));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function makeToken(payload: Record<string, unknown>): string {
  return `header.${base64url(payload)}.signature`;
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function renderLogin() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>PromotionList-Stub</div>} />
          <Route path="/admin/promotions" element={<div>AdminPromotionList-Stub</div>} />
          <Route path="/signup" element={<div>SignUp-Stub</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('로그인ID'), { target: { value: 'gdhong' } });
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'pw1234' } });
  fireEvent.click(screen.getByRole('button', { name: '로그인' }));
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
  vi.stubGlobal('fetch', vi.fn());
});

describe('Login', () => {
  it('USER로 로그인 성공하면 "/"로 이동하고 스토어에 role이 USER로 저장된다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ accessToken: makeToken({ sub: 'u1', role: 'USER', loginId: 'gdhong' }), refreshToken: 'r1' }, 200),
    );

    renderLogin();
    fillAndSubmit();

    expect(await screen.findByText('PromotionList-Stub')).toBeInTheDocument();
    expect(useAuthStore.getState().user?.role).toBe('USER');
  });

  it('ADMIN으로 로그인 성공하면 "/admin/promotions"로 이동한다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ accessToken: makeToken({ sub: 'a1', role: 'ADMIN', loginId: 'admin1' }), refreshToken: 'r1' }, 200),
    );

    renderLogin();
    fillAndSubmit();

    expect(await screen.findByText('AdminPromotionList-Stub')).toBeInTheDocument();
    expect(useAuthStore.getState().user?.role).toBe('ADMIN');
  });

  it('401 응답이면 로그인 실패 메시지가 alert로 노출되고 화면 전환은 없다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ code: 'INVALID_CREDENTIALS', message: '로그인ID 또는 비밀번호가 일치하지 않습니다.' }, 401),
    );

    renderLogin();
    fillAndSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('로그인ID 또는 비밀번호가 일치하지 않습니다.');
    expect(screen.queryByText('PromotionList-Stub')).not.toBeInTheDocument();
    expect(screen.queryByText('AdminPromotionList-Stub')).not.toBeInTheDocument();
  });

  it('400 응답이면 해당 에러 메시지가 alert로 노출된다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ code: 'VALIDATION_ERROR', message: '필수 입력값이 누락되었습니다.' }, 400),
    );

    renderLogin();
    fillAndSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('필수 입력값이 누락되었습니다.');
  });

  it('회원가입 링크 클릭 시 회원가입 화면으로 이동한다', async () => {
    renderLogin();

    fireEvent.click(screen.getByRole('link', { name: '회원가입' }));

    expect(await screen.findByText('SignUp-Stub')).toBeInTheDocument();
  });
});
