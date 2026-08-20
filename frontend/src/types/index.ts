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
  myAttemptCount?: number;
}
export type ParticipationStatus = 'APPLIED' | 'CANCELLED' | 'REAPPLIED';
export type ParticipationResult = 'PENDING' | null;
export interface Participation {
  id: string;
  userId: string;
  promotionId: string;
  promotionTitle: string;
  promotionType: PromotionType;
  status: ParticipationStatus;
  participatedAt: string;
  updatedAt: string;
  attemptCount: number;
  result: ParticipationResult;
  attempts?: ParticipationAttempt[];
}
export type AttemptResult = 'WIN' | 'LOSE';
export interface ParticipationAttempt {
  id: string; participationId: string; attemptNo: number;
  result: AttemptResult; attemptedAt: string;
}
export interface TokenPair { accessToken: string; refreshToken: string; }
export interface LoginRequest { loginId: string; password: string; }
export interface SignupRequest { loginId: string; password: string; businessName: string; name: string; phone?: string; }
export interface MeUpdateRequest {
  businessName?: string;
  name?: string;
  phone?: string;
}
export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}
export interface RouletteResult {
  participationId: string;
  attemptNo: number;
  result: AttemptResult;
  attemptCount: number;
  maxParticipationCount: number;
}
export interface PromotionCreateRequest {
  title: string;
  type: PromotionType;
  description: string;
  startAt: string;
  endAt: string;
  maxParticipationCount?: number;
}
export interface PromotionUpdateRequest {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  maxParticipationCount?: number;
}
export interface AdminParticipationItem {
  participationId: string;
  businessName: string;
  name: string;
  status: ParticipationStatus;
  result: 'PENDING' | 'WIN' | 'LOSE' | null;
  participatedAt: string;
}
export interface AdminParticipationSummary {
  totalCount: number;
  winCount?: number;
  loseCount?: number;
  items: AdminParticipationItem[];
}
