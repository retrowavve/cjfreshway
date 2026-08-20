import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { httpClient } from '../api/httpClient';
import type { SignupRequest, User } from '../types';

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ loginId: '', password: '', businessName: '', name: '', phone: '' });

  const signupMutation = useMutation({
    mutationFn: (body: SignupRequest) => httpClient.post<User>('/auth/signup', body, { skipAuth: true }),
    onSuccess: () => navigate('/login'),
  });

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body: SignupRequest = {
      loginId: form.loginId,
      password: form.password,
      businessName: form.businessName,
      name: form.name,
      ...(form.phone ? { phone: form.phone } : {}),
    };
    signupMutation.mutate(body);
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>응모해 회원가입</h1>
        <label>로그인ID<input name="loginId" value={form.loginId} onChange={handleChange} required /></label>
        <label>비밀번호<input name="password" type="password" value={form.password} onChange={handleChange} required /></label>
        <label>사업체명<input name="businessName" value={form.businessName} onChange={handleChange} required /></label>
        <label>담당자명<input name="name" value={form.name} onChange={handleChange} required /></label>
        <label>연락처(선택)<input name="phone" value={form.phone} onChange={handleChange} /></label>
        {signupMutation.isError && (
          <p role="alert" className="auth-error">
            {signupMutation.error instanceof Error ? signupMutation.error.message : '가입에 실패했습니다.'}
          </p>
        )}
        <button type="submit" disabled={signupMutation.isPending}>가입하기</button>
        <p className="auth-footer">이미 계정이 있으신가요? <Link to="/login">로그인 화면으로</Link></p>
      </form>
    </div>
  );
}
