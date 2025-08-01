import { RootState } from '../index';

// Auth state selectors
export const selectAuth = (state: RootState) => state.auth;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectIsLocalMode = (state: RootState) => state.auth.isLocalMode;
export const selectUser = (state: RootState) => state.auth.user;
export const selectUserProfile = (state: RootState) => state.auth.user;
export const selectAccessToken = (state: RootState) => state.auth.accessToken;
export const selectAuthLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;