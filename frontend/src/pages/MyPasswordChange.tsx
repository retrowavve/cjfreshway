import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { httpClient } from '../api/httpClient';
import { useAuthStore } from '../stores/authStore';
import Gnb from '../components/Gnb';
import type { PasswordChangeRequest } from '../types';

export default function MyPasswordChange() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });

  const changeMutation = useMutation({
    mutationFn: (body: PasswordChangeRequest) => httpClient.put<unknown>('/me/password', body),
    onSuccess: () => {
      useAuthStore.getState().logout();
      navigate('/login');
    },
  });

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    changeMutation.mutate(form);
  }

  return (
    <>
      <Gnb />
      <div className="promotion-page mypage-page">
        <Link to="/me" className="promotion-back">← 마이페이지</Link>
        <form className="auth-form mypage-form" onSubmit={handleSubmit}>
          <h1 className="promotion-section-title">비밀번호 변경</h1>
          <label>현재 비밀번호<input name="currentPassword" type="password" value={form.currentPassword} onChange={handleChange} required /></label>
          <label>새 비밀번호<input name="newPassword" type="password" value={form.newPassword} onChange={handleChange} required /></label>
          {changeMutation.isError && (
            <p role="alert" className="auth-error">
              {changeMutation.error instanceof Error ? changeMutation.error.message : '비밀번호 변경에 실패했습니다.'}
            </p>
          )}
          <button type="submit" disabled={changeMutation.isPending}>비밀번호 변경</button>
        </form>
      </div>
    </>
  );
}
