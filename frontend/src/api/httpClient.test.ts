import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient, ApiError } from './httpClient';
import { useAuthStore } from '../stores/authStore';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
  vi.stubGlobal('fetch', vi.fn());
});

describe('httpClient', () => {
  it('accessToken이 있으면 Authorization 헤더가 첨부된다', async () => {
    useAuthStore.setState({ accessToken: 'token-abc' });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await httpClient.get('/promotions');

    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const options = call[1] as RequestInit;
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer token-abc');
  });

  it('skipAuth: true면 Authorization 헤더가 없다', async () => {
    useAuthStore.setState({ accessToken: 'token-abc' });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await httpClient.get('/auth/login', { skipAuth: true });

    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const options = call[1] as RequestInit;
    expect((options.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('200 응답이면 JSON 파싱 결과를 그대로 반환한다', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse({ id: '1', title: 'promo' }));

    const result = await httpClient.get<{ id: string; title: string }>('/promotions/1');

    expect(result).toEqual({ id: '1', title: 'promo' });
  });

  it('2xx가 아닌 응답이면 ApiError를 throw한다', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ code: 'NOT_FOUND', message: '리소스를 찾을 수 없습니다' }, 404),
    );

    await expect(httpClient.get('/promotions/999')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: '리소스를 찾을 수 없습니다',
    });
  });

  it('2xx가 아닌 응답이면 ApiError 인스턴스이다', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ code: 'NOT_FOUND', message: 'not found' }, 404),
    );

    await expect(httpClient.get('/promotions/999')).rejects.toBeInstanceOf(ApiError);
  });

  it('401 응답 시 refresh 후 원 요청을 새 토큰으로 1회 재시도해 최종 성공 응답을 반환한다', async () => {
    useAuthStore.setState({ accessToken: 'old-access', refreshToken: 'old-refresh' });
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ code: 'UNAUTHORIZED', message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'new-access', refreshToken: 'new-refresh' }, 200))
      .mockResolvedValueOnce(jsonResponse({ data: 'ok' }, 200));

    const result = await httpClient.get<{ data: string }>('/me');

    expect(result).toEqual({ data: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain('/auth/refresh');
    expect(useAuthStore.getState().accessToken).toBe('new-access');
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh');

    const retryOptions = fetchMock.mock.calls[2][1] as RequestInit;
    expect((retryOptions.headers as Record<string, string>).Authorization).toBe('Bearer new-access');
  });

  it('refresh 자체가 실패하면 logout이 호출되고 원래 401 ApiError가 throw된다', async () => {
    useAuthStore.setState({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      user: { id: 'u1', loginId: 'gdhong', role: 'USER' },
    });
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ code: 'UNAUTHORIZED', message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ code: 'UNAUTHORIZED', message: 'invalid refresh' }, 401));

    await expect(httpClient.get('/me')).rejects.toMatchObject({ status: 401 });

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('재시도된 요청이 다시 401이어도 refresh는 정확히 1회만 호출된다', async () => {
    useAuthStore.setState({ accessToken: 'old-access', refreshToken: 'old-refresh' });
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ code: 'UNAUTHORIZED', message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'new-access', refreshToken: 'new-refresh' }, 200))
      .mockResolvedValueOnce(jsonResponse({ code: 'UNAUTHORIZED', message: 'still expired' }, 401));

    await expect(httpClient.get('/me')).rejects.toMatchObject({ status: 401 });

    const refreshCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('skipAuth: true인 요청이 401을 받으면 refresh를 시도하지 않고 바로 ApiError를 던진다', async () => {
    useAuthStore.setState({ accessToken: 'old-access', refreshToken: 'old-refresh' });
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse({ code: 'INVALID_CREDENTIALS', message: 'wrong' }, 401));

    await expect(httpClient.post('/auth/login', { loginId: 'a', password: 'b' }, { skipAuth: true })).rejects.toMatchObject(
      { status: 401, code: 'INVALID_CREDENTIALS' },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
