import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '../api/httpClient';
import { useAuthStore } from '../stores/authStore';
import type { Admin, MeUpdateRequest, PasswordChangeRequest, User } from '../types';

export default function MyPage() {
  const role = useAuthStore((s) => s.user?.role);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: () => httpClient.get<User | Admin>('/me'),
  });

  return (
    <div className="promotion-page mypage-page">
      <h1 className="promotion-section-title">마이페이지</h1>
      <div className="mypage-layout">
        <section>
          {isLoading && <p>불러오는 중...</p>}
          {isError && <p role="alert">내 정보를 불러오지 못했습니다.</p>}
          {data && <MeInfoForm data={data} role={role} />}
        </section>
        <section>
          <PasswordChangeForm />
        </section>
      </div>
      {role === 'USER' && (
        <Link to="/me/participations" className="btn-primary mypage-link">내 참여내역 보기</Link>
      )}
    </div>
  );
}

function MeInfoForm({ data, role }: { data: User | Admin; role?: 'USER' | 'ADMIN' }) {
  const queryClient = useQueryClient();
  const isUser = role === 'USER';
  const [form, setForm] = useState(() => ({
    businessName: isUser && 'businessName' in data ? data.businessName : '',
    name: data.name,
    phone: isUser && 'phone' in data ? (data.phone ?? '') : '',
  }));

  const saveMutation = useMutation({
    mutationFn: (body: MeUpdateRequest) => httpClient.put<User | Admin>('/me', body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated);
      setForm({
        businessName: isUser && 'businessName' in updated ? updated.businessName : '',
        name: updated.name,
        phone: isUser && 'phone' in updated ? (updated.phone ?? '') : '',
      });
    },
  });

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body: MeUpdateRequest = isUser
      ? { businessName: form.businessName, name: form.name, phone: form.phone }
      : { name: form.name };
    saveMutation.mutate(body);
  }

  return (
    <form className="auth-form mypage-form" onSubmit={handleSubmit}>
      <label>로그인ID<input value={data.loginId} disabled readOnly /></label>
      {isUser && (
        <label>사업체명<input name="businessName" value={form.businessName} onChange={handleChange} required /></label>
      )}
      <label>담당자명<input name="name" value={form.name} onChange={handleChange} required /></label>
      {isUser && (
        <label>연락처<input name="phone" value={form.phone} onChange={handleChange} /></label>
      )}
      {saveMutation.isError && (
        <p role="alert" className="auth-error">
          {saveMutation.error instanceof Error ? saveMutation.error.message : '정보 저장에 실패했습니다.'}
        </p>
      )}
      <button type="submit" disabled={saveMutation.isPending}>정보 저장</button>
    </form>
  );
}

function PasswordChangeForm() {
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
    <form className="auth-form mypage-form" onSubmit={handleSubmit}>
      <h2 className="promotion-section-title">비밀번호 변경</h2>
      <label>현재 비밀번호<input name="currentPassword" type="password" value={form.currentPassword} onChange={handleChange} required /></label>
      <label>새 비밀번호<input name="newPassword" type="password" value={form.newPassword} onChange={handleChange} required /></label>
      {changeMutation.isError && (
        <p role="alert" className="auth-error">
          {changeMutation.error instanceof Error ? changeMutation.error.message : '비밀번호 변경에 실패했습니다.'}
        </p>
      )}
      <button type="submit" disabled={changeMutation.isPending}>비밀번호 변경</button>
    </form>
  );
}
