import type { AuthResponse, RegisterResponse, ResendCodeResponse, User } from "@/types";
import { http } from "./client";

export const authApi = {
  login: (email: string, password: string) => http.post<AuthResponse>("/api/auth/login", { email, password }),
  register: (name: string, email: string, password: string, upiId?: string | null) =>
    http.post<RegisterResponse>("/api/auth/register", { name, email, password, upiId: upiId || null }),
  verifyEmail: (email: string, code: string) => http.post<AuthResponse>("/api/auth/verify-email", { email, code }),
  resendCode: (email: string) => http.post<ResendCodeResponse>("/api/auth/resend-code", { email }),
  me: () => http.get<User>("/api/users/me"),
  /** An empty upiId removes the saved UPI ID. */
  updateProfile: (profile: { name: string; upiId: string }) => http.put<User>("/api/users/me", profile),
  uploadAvatar: (image: Blob) => {
    const form = new FormData();
    form.append("file", image, "avatar.jpg");
    return http.upload<User>("/api/users/me/avatar", form);
  },
  removeAvatar: () => http.delete<User>("/api/users/me/avatar"),
  changePassword: (currentPassword: string, newPassword: string) =>
    http.put<void>("/api/users/me/password", { currentPassword, newPassword }),
};
