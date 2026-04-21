export const APP_CONFIG = {
  appName: "Institution Partner Console",
  storageKeys: {
    accessToken: "institution_access_token",
    refreshToken: "institution_refresh_token",
    user: "institution_user",
  },
};

export const API_CONFIG = {
  baseUrl:
    process.env.NEXT_PUBLIC_INSTITUTION_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL_LOCAL ||
    "http://localhost:8000",
};
