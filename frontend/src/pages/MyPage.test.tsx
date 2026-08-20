import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MyPage from './MyPage';
import Login from './Login';
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
      <MemoryRouter initialEntries={['/me']}>
        <Routes>
          <Route path="/me" element={<MyPage />} />
          <Route path="/me/participations" element={<div>MyParticipations-Stub</div>} />
          <Route path="/login" element={<Login />} />
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

describe('MyPage', () => {
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

  it('비밀번호 변경 성공 시 로그아웃 후 로그인 화면으로 이동, 새 비밀번호로 재로그인 가능', async () => {
    (fetch as Mock)
      .mockResolvedValueOnce(jsonResponse(userMe, 200))
      .mockResolvedValueOnce(jsonResponse({}, 200))
      .mockResolvedValueOnce(
        jsonResponse(
          { accessToken: makeToken({ sub: 'u1', role: 'USER', loginId: 'gdhong' }), refreshToken: 'r2' },
          200,
        ),
      );

    renderPage('USER');

    await screen.findByDisplayValue('테스트상사');

    fireEvent.change(screen.getByLabelText('현재 비밀번호'), { target: { value: 'oldpass' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'newpass' } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    expect(await screen.findByRole('heading', { name: '응모해' })).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();

    fireEvent.change(screen.getByLabelText('로그인ID'), { target: { value: 'gdhong' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'newpass' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => expect(useAuthStore.getState().user?.role).toBe('USER'));
  });

  it('비밀번호 변경 실패(401) 시 에러 메시지 표시, 로그아웃 안 됨', async () => {
    // httpClient는 401 응답을 받으면 skipAuth가 아닌 한 항상 /auth/refresh를 1회 시도한 뒤
    // 원 요청을 재시도한다(F1에서 이미 구현된 공통 동작, httpClient는 이 태스크에서 수정하지 않음).
    // 따라서 이 케이스도 refresh 성공 + 재시도 401까지 mock에 포함해야 실제 동작과 일치한다.
    (fetch as Mock)
      .mockResolvedValueOnce(jsonResponse(userMe, 200)) // GET /me
      .mockResolvedValueOnce(
        jsonResponse({ code: 'INVALID_CURRENT_PASSWORD', message: '현재 비밀번호가 일치하지 않습니다.' }, 401),
      ) // PUT /me/password (최초 시도)
      .mockResolvedValueOnce(
        jsonResponse({ accessToken: makeToken({ sub: 'u1', role: 'USER', loginId: 'gdhong' }), refreshToken: 'r2' }, 200),
      ) // POST /auth/refresh
      .mockResolvedValueOnce(
        jsonResponse({ code: 'INVALID_CURRENT_PASSWORD', message: '현재 비밀번호가 일치하지 않습니다.' }, 401),
      ); // PUT /me/password (재시도, 최종 실패)

    renderPage('USER');

    await screen.findByDisplayValue('테스트상사');

    fireEvent.change(screen.getByLabelText('현재 비밀번호'), { target: { value: 'wrongpass' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'newpass' } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('현재 비밀번호가 일치하지 않습니다.');
    expect(useAuthStore.getState().accessToken).not.toBeNull();
  });

  it('User에게만 참여내역 링크가 노출된다', async () => {
    (fetch as Mock).mockResolvedValueOnce(jsonResponse(userMe, 200));

    renderPage('USER');

    await screen.findByDisplayValue('테스트상사');
    expect(screen.getByRole('link', { name: '내 참여내역 보기' })).toBeInTheDocument();
  });

  it('Admin에게는 참여내역 링크가 노출되지 않는다', async () => {
    (fetch as Mock).mockResolvedValueOnce(jsonResponse(adminMe, 200));

    renderPage('ADMIN');

    await screen.findByDisplayValue('관리자');
    expect(screen.queryByRole('link', { name: '내 참여내역 보기' })).toBeNull();
  });
});
