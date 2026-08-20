import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminPromotionForm from './AdminPromotionForm';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/promotions/new" element={<AdminPromotionForm />} />
          <Route path="/admin/promotions/:id/edit" element={<AdminPromotionForm />} />
          <Route path="/admin/promotions" element={<div>List-Stub</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function fillCreateForm() {
  fireEvent.change(screen.getByLabelText('프로모션명'), { target: { value: '여름 특가전' } });
  fireEvent.change(screen.getByLabelText('시작일시'), { target: { value: '2026-08-01T00:00' } });
  fireEvent.change(screen.getByLabelText('종료일시'), { target: { value: '2026-08-31T00:00' } });
  fireEvent.change(screen.getByLabelText('상세설명'), { target: { value: '설명' } });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

describe('AdminPromotionForm', () => {
  it('등록 모드, 초기 DIRECT 상태에서는 최대 참여 횟수 입력란이 없다', () => {
    renderAt('/admin/promotions/new');

    expect(screen.queryByLabelText('최대 참여 횟수')).not.toBeInTheDocument();
  });

  it('ROULETTE 선택 시 최대 참여 횟수 입력란이 나타난다', () => {
    renderAt('/admin/promotions/new');

    fireEvent.click(screen.getByRole('radio', { name: 'ROULETTE' }));

    expect(screen.getByLabelText('최대 참여 횟수')).toBeInTheDocument();
  });

  it('등록 성공 시 목록 화면으로 이동한다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse(
        {
          id: 'p1',
          title: '여름 특가전',
          type: 'DIRECT',
          description: '설명',
          startAt: '2026-08-01T12:00:00.000Z',
          endAt: '2026-08-31T12:00:00.000Z',
          status: 'UPCOMING',
          maxParticipationCount: 1,
          createdBy: 'a1',
        },
        201,
      ),
    );

    renderAt('/admin/promotions/new');
    fillCreateForm();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('List-Stub')).toBeInTheDocument();
  });

  it('수정 모드에서는 기존 값을 불러오고 타입 라디오가 비활성화된다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse(
        {
          id: 'p1',
          title: '여름 특가전',
          type: 'ROULETTE',
          description: '설명',
          startAt: '2026-08-01T12:00:00.000Z',
          endAt: '2026-08-31T12:00:00.000Z',
          status: 'ONGOING',
          maxParticipationCount: 3,
          createdBy: 'a1',
        },
        200,
      ),
    );

    renderAt('/admin/promotions/p1/edit');

    await screen.findByDisplayValue('여름 특가전');
    const roulette = screen.getByRole('radio', { name: 'ROULETTE' });
    const direct = screen.getByRole('radio', { name: 'DIRECT' });
    expect(roulette).toBeChecked();
    expect(roulette).toBeDisabled();
    expect(direct).toBeDisabled();
  });

  it('수정 성공 시 목록 화면으로 이동한다', async () => {
    (fetch as Mock)
      .mockResolvedValueOnce(
        jsonResponse(
          {
            id: 'p1',
            title: '여름 특가전',
            type: 'ROULETTE',
            description: '설명',
            startAt: '2026-08-01T12:00:00.000Z',
            endAt: '2026-08-31T12:00:00.000Z',
            status: 'ONGOING',
            maxParticipationCount: 3,
            createdBy: 'a1',
          },
          200,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            id: 'p1',
            title: '여름 특가전',
            type: 'ROULETTE',
            description: '설명',
            startAt: '2026-08-01T12:00:00.000Z',
            endAt: '2026-08-31T12:00:00.000Z',
            status: 'ONGOING',
            maxParticipationCount: 3,
            createdBy: 'a1',
          },
          200,
        ),
      );

    renderAt('/admin/promotions/p1/edit');
    await screen.findByDisplayValue('여름 특가전');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('List-Stub')).toBeInTheDocument();
  });

  it('등록 실패 시 에러 메시지를 alert로 표시하고 화면 전환하지 않는다', async () => {
    (fetch as Mock).mockResolvedValueOnce(
      jsonResponse({ code: 'VALIDATION_ERROR', message: '필수 항목을 입력해주세요.' }, 400),
    );

    renderAt('/admin/promotions/new');
    fillCreateForm();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('필수 항목을 입력해주세요.');
    expect(screen.queryByText('List-Stub')).not.toBeInTheDocument();
  });
});
