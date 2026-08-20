import { describe, it, expect, beforeEach, vi } from 'vitest';

function base64url(json: unknown): string {
  const base64 = btoa(JSON.stringify(json));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function makeToken(payload: Record<string, unknown>): string {
  return `header.${base64url(payload)}.signature`;
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('authStore 영속화(새로고침 시뮬레이션)', () => {
  it('login 후 모듈을 다시 로드해도(=새로고침) 로그인 상태가 유지된다', async () => {
    const { useAuthStore: store1 } = await import('./authStore');
    const tokens = {
      accessToken: makeToken({ sub: 'u1', role: 'USER', loginId: 'gdhong' }),
      refreshToken: 'refresh-1',
    };
    store1.getState().login(tokens);

    vi.resetModules();
    const { useAuthStore: store2 } = await import('./authStore');

    expect(store2.getState().accessToken).toBe(tokens.accessToken);
    expect(store2.getState().refreshToken).toBe('refresh-1');
    expect(store2.getState().user).toEqual({ id: 'u1', loginId: 'gdhong', role: 'USER' });
  });

  it('logout 후 모듈을 다시 로드하면 상태가 모두 null이다', async () => {
    const { useAuthStore: store1 } = await import('./authStore');
    const tokens = {
      accessToken: makeToken({ sub: 'u1', role: 'USER', loginId: 'gdhong' }),
      refreshToken: 'refresh-1',
    };
    store1.getState().login(tokens);
    store1.getState().logout();

    vi.resetModules();
    const { useAuthStore: store2 } = await import('./authStore');

    expect(store2.getState().accessToken).toBeNull();
    expect(store2.getState().refreshToken).toBeNull();
    expect(store2.getState().user).toBeNull();
  });
});
