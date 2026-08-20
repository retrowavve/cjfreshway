export interface User {
  id: string; loginId: string; businessName: string; name: string;
  phone?: string; createdAt: string;
}
export interface Admin {
  id: string; loginId: string; name: string; createdAt: string;
}
export type PromotionType = 'DIRECT' | 'ROULETTE';
export type PromotionStatus = 'UPCOMING' | 'ONGOING' | 'ENDED';
export interface Promotion {
  id: string; title: string; type: PromotionType; description: string;
  startAt: string; endAt: string; status: PromotionStatus;
  maxParticipationCount: number; createdBy: string;
}
export type ParticipationStatus = 'APPLIED' | 'CANCELLED' | 'REAPPLIED';
export type ParticipationResult = 'PENDING' | null;
export interface Participation {
  id: string; userId: string; promotionId: string; status: ParticipationStatus;
  participatedAt: string; updatedAt: string; attemptCount: number; result: ParticipationResult;
}
export type AttemptResult = 'WIN' | 'LOSE';
export interface ParticipationAttempt {
  id: string; participationId: string; attemptNo: number;
  result: AttemptResult; attemptedAt: string;
}
export interface TokenPair { accessToken: string; refreshToken: string; }
export interface LoginRequest { loginId: string; password: string; }
export interface SignupRequest { loginId: string; password: string; businessName: string; name: string; phone?: string; }
