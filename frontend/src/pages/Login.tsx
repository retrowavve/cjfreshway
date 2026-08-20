import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { httpClient } from '../api/httpClient';
import { useAuthStore } from '../stores/authStore';
import type { LoginRequest, TokenPair } from '../types';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ loginId: '', password: '' });

  const loginMutation = useMutation({
    mutationFn: (body: LoginRequest) => httpClient.post<TokenPair>('/auth/login', body, { skipAuth: true }),
    onSuccess: (tokens) => {
      useAuthStore.getState().login(tokens);
      const role = useAuthStore.getState().user?.role;
      navigate(role === 'ADMIN' ? '/admin/promotions' : '/');
    },
  });

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    loginMutation.mutate({ loginId: form.loginId, password: form.password });
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>응모해</h1>
        <label>로그인ID<input name="loginId" value={form.loginId} onChange={handleChange} required /></label>
        <label>비밀번호<input name="password" type="password" value={form.password} onChange={handleChange} required /></label>
        {loginMutation.isError && (
          <p role="alert" className="auth-error">
            {loginMutation.error instanceof Error ? loginMutation.error.message : '로그인에 실패했습니다.'}
          </p>
        )}
        <button type="submit" disabled={loginMutation.isPending}>로그인</button>
        <p className="auth-footer">계정이 없으신가요? <Link to="/signup">회원가입</Link></p>
      </form>
    </div>
  );
}
