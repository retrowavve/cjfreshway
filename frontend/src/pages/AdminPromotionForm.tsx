import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient, ApiError } from '../api/httpClient';
import Gnb from '../components/Gnb';
import type { Promotion, PromotionCreateRequest, PromotionType, PromotionUpdateRequest } from '../types';

function toLocalInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16);
}

export default function AdminPromotionForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading, isError } = useQuery({
    queryKey: ['promotion', id],
    queryFn: () => httpClient.get<Promotion>(`/promotions/${id}`),
    enabled: isEdit,
  });

  const [form, setForm] = useState({
    title: '',
    type: 'DIRECT' as PromotionType,
    description: '',
    startAt: '',
    endAt: '',
    maxParticipationCount: '1',
  });

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        type: existing.type,
        description: existing.description,
        startAt: toLocalInputValue(existing.startAt),
        endAt: toLocalInputValue(existing.endAt),
        maxParticipationCount: String(existing.maxParticipationCount),
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        const body: PromotionUpdateRequest = {
          title: form.title,
          description: form.description,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          ...(existing?.type === 'ROULETTE' ? { maxParticipationCount: Number(form.maxParticipationCount) } : {}),
        };
        return httpClient.put<Promotion>(`/admin/promotions/${id}`, body);
      }
      const body: PromotionCreateRequest = {
        title: form.title,
        type: form.type,
        description: form.description,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        ...(form.type === 'ROULETTE' ? { maxParticipationCount: Number(form.maxParticipationCount) } : {}),
      };
      return httpClient.post<Promotion>('/admin/promotions', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPromotions'] });
      navigate('/admin/promotions');
    },
  });

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleTypeChange(e: ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, type: e.target.value as PromotionType }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  if (isEdit && isLoading) return <div className="promotion-page"><p>불러오는 중...</p></div>;
  if (isEdit && isError) return <div className="promotion-page"><p role="alert">프로모션을 불러오지 못했습니다.</p></div>;

  return (
    <>
      <Gnb />
      <div className="promotion-page">
      <form className="auth-form admin-form" onSubmit={handleSubmit}>
        <h1 className="promotion-section-title">{isEdit ? '프로모션 수정' : '프로모션 등록'}</h1>
        <label>프로모션명<input name="title" value={form.title} onChange={handleChange} required /></label>
        <div className="radio-group">
          <label className="radio-label"><input type="radio" name="type" value="DIRECT" checked={form.type === 'DIRECT'} disabled={isEdit} onChange={handleTypeChange} /> DIRECT</label>
          <label className="radio-label"><input type="radio" name="type" value="ROULETTE" checked={form.type === 'ROULETTE'} disabled={isEdit} onChange={handleTypeChange} /> ROULETTE</label>
        </div>
        <label>시작일시<input type="datetime-local" name="startAt" value={form.startAt} onChange={handleChange} required /></label>
        <label>종료일시<input type="datetime-local" name="endAt" value={form.endAt} onChange={handleChange} required /></label>
        {form.type === 'ROULETTE' && (
          <label>최대 참여 횟수<input type="number" name="maxParticipationCount" min={1} value={form.maxParticipationCount} onChange={handleChange} required /></label>
        )}
        <label>상세설명<textarea name="description" value={form.description} onChange={handleChange} required /></label>
        {saveMutation.isError && (
          <p role="alert" className="auth-error">
            {saveMutation.error instanceof ApiError ? saveMutation.error.message : '저장에 실패했습니다.'}
          </p>
        )}
        <div className="admin-form-actions">
          <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>저장</button>
          <Link to="/admin/promotions" className="btn-secondary">취소</Link>
        </div>
      </form>
      </div>
    </>
  );
}
