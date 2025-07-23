
// src/lib/types/auth.types.ts

export interface RateLimitConfig {
  otpRequestsPerHour: number;
  otpRequestsPerDay: number;
  signupAttemptsPerHour: number;
  signupAttemptsPerDay: number;
}
export const defaultRateLimitConfig: RateLimitConfig = {
  otpRequestsPerHour: 5,
  otpRequestsPerDay: 20,
  signupAttemptsPerHour: 10, // Conceptual, not fully implemented on signup yet
  signupAttemptsPerDay: 50,  // Conceptual
};
