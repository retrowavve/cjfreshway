import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SignUp from './SignUp';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function renderSignUp() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<div>Login-Stub</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('로그인ID'), { target: { value: 'gdhong' } });
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'pw1234' } });
  fireEvent.change(screen.getByLabelText('사업체명'), { target: { value: 'CJ프레시웨이' } });
  fireEvent.change(screen.getByLabelText('담당자명'), { target: { value: '홍길동' } });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

describe('SignUp', () => {
  it('phone을 비운 채 제출하면 /auth/signup 요청 body에 phone 키가 없고, 성공 시 로그인 화면으로 이동한다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ id: 'u1', loginId: 'gdhong', businessName: 'CJ프레시웨이', name: '홍길동', createdAt: '2026-01-01' }, 201),
    );

    renderSignUp();
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }));

    expect(await screen.findByText('Login-Stub')).toBeInTheDocument();

    const call = (fetch as Mock).mock.calls[0];
    expect(String(call[0])).toContain('/auth/signup');
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body).toEqual({ loginId: 'gdhong', password: 'pw1234', businessName: 'CJ프레시웨이', name: '홍길동' });
    expect(body).not.toHaveProperty('phone');
  });

  it('phone을 채워서 제출하면 요청 body에 phone이 포함된다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ id: 'u1', loginId: 'gdhong', businessName: 'CJ프레시웨이', name: '홍길동', createdAt: '2026-01-01' }, 201),
    );

    renderSignUp();
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText('연락처(선택)'), { target: { value: '010-1234-5678' } });
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }));

    await screen.findByText('Login-Stub');

    const call = (fetch as Mock).mock.calls[0];
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.phone).toBe('010-1234-5678');
  });

  it('409 응답이면 중복 아이디 에러 메시지가 alert로 노출되고 화면 전환은 없다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ code: 'LOGIN_ID_DUPLICATE', message: '이미 사용 중인 아이디입니다.' }, 409),
    );

    renderSignUp();
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('이미 사용 중인 아이디입니다.');
    expect(screen.queryByText('Login-Stub')).not.toBeInTheDocument();
  });

  it('400 응답이면 해당 에러 메시지가 alert로 노출된다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ code: 'VALIDATION_ERROR', message: '필수 입력값이 누락되었습니다.' }, 400),
    );

    renderSignUp();
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('필수 입력값이 누락되었습니다.');
  });

  it('loginId input은 required이고 phone input은 required가 아니다', () => {
    renderSignUp();

    expect(screen.getByLabelText('로그인ID')).toBeRequired();
    expect(screen.getByLabelText('연락처(선택)')).not.toBeRequired();
  });
});
