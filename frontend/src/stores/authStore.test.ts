import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore, decodeAccessToken } from './authStore';
import type { TokenPair } from '../types';

function base64url(json: unknown): string {
  const base64 = btoa(JSON.stringify(json));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeToken(payload: Record<string, unknown>): string {
  return `header.${base64url(payload)}.signature`;
}

const validPayload = { sub: 'u1', role: 'USER' as const, loginId: 'gdhong' };
const validTokens: TokenPair = {
  accessToken: makeToken(validPayload),
  refreshToken: 'refresh-token-1',
};

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
  localStorage.clear();
});

describe('authStore', () => {
  it('login 호출 시 토큰과 디코드된 user가 저장된다', () => {
    useAuthStore.getState().login(validTokens);

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe(validTokens.accessToken);
    expect(state.refreshToken).toBe(validTokens.refreshToken);
    expect(state.user).toEqual({ id: 'u1', loginId: 'gdhong', role: 'USER' });
  });

  it('setTokens는 user를 바꾸지 않고 토큰만 갱신한다', () => {
    useAuthStore.getState().login(validTokens);
    const originalUser = useAuthStore.getState().user;

    const newTokens: TokenPair = { accessToken: 'new-access', refreshToken: 'new-refresh' };
    useAuthStore.getState().setTokens(newTokens);

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('new-access');
    expect(state.refreshToken).toBe('new-refresh');
    expect(state.user).toEqual(originalUser);
  });

  it('logout 호출 시 accessToken/refreshToken/user가 모두 null이 된다', () => {
    useAuthStore.getState().login(validTokens);

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('login 후 localStorage(auth-storage)에 accessToken이 저장된다', () => {
    useAuthStore.getState().login(validTokens);

    const raw = localStorage.getItem('auth-storage');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.accessToken).toBe(validTokens.accessToken);
  });

  it('decodeAccessToken은 표준 payload를 {id, loginId, role}로 매핑한다', () => {
    const token = makeToken({ sub: 'u2', role: 'ADMIN', loginId: 'admin1' });

    const user = decodeAccessToken(token);

    expect(user).toEqual({ id: 'u2', loginId: 'admin1', role: 'ADMIN' });
  });

  it('decodeAccessToken은 base64url 특수문자(-, _)가 포함된 payload도 정확히 디코드한다', () => {
    // 실제로 '+'/'/' 가 나오도록 값을 구성해 base64url 인코딩 시 '-'/'_'가 포함되게 한다
    const payload = { sub: '???>>>', role: 'USER' as const, loginId: 'user-a' };
    const token = makeToken(payload);
    expect(token).toMatch(/[-_]/);

    const user = decodeAccessToken(token);

    expect(user).toEqual({ id: '???>>>', loginId: 'user-a', role: 'USER' });
  });
});
