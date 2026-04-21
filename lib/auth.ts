"use client";

import { APP_CONFIG } from "./config";

export function setSession(data: {
  accessToken: string;
  refreshToken?: string;
  user?: unknown;
}) {
  localStorage.setItem(APP_CONFIG.storageKeys.accessToken, data.accessToken);
  if (data.refreshToken) {
    localStorage.setItem(APP_CONFIG.storageKeys.refreshToken, data.refreshToken);
  }
  if (data.user) {
    localStorage.setItem(APP_CONFIG.storageKeys.user, JSON.stringify(data.user));
  }
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(APP_CONFIG.storageKeys.accessToken);
}

export function clearSession() {
  localStorage.removeItem(APP_CONFIG.storageKeys.accessToken);
  localStorage.removeItem(APP_CONFIG.storageKeys.refreshToken);
  localStorage.removeItem(APP_CONFIG.storageKeys.user);
}
