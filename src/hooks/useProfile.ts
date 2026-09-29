"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { useAuth } from "@/providers/AuthProvider";

export function useUpdateProfile() {
  const { setUser } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profile: { name: string; upiId: string }) => authApi.updateProfile(profile),
    onSuccess: (user) => {
      setUser(user);
      // Group member lists embed names and UPI IDs.
      void qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) => authApi.changePassword(current, next),
  });
}

export function useUploadAvatar() {
  const { setUser } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (image: Blob) => authApi.uploadAvatar(image),
    onSuccess: (user) => {
      setUser(user);
      // Group member lists embed avatar URLs.
      void qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useRemoveAvatar() {
  const { setUser } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.removeAvatar(),
    onSuccess: (user) => {
      setUser(user);
      void qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
