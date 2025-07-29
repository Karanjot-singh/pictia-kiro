import { createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '@/services';
import { AuthResult, AuthError } from '@/types';

/**
 * Async thunk for user authentication
 */
export const authenticateUser = createAsyncThunk<
  AuthResult,
  void,
  { rejectValue: AuthError }
>('auth/authenticate', async (_, { rejectWithValue }) => {
  try {
    const result = await authService.authenticate();
    return result;
  } catch (error) {
    return rejectWithValue(error as AuthError);
  }
});

/**
 * Async thunk for token refresh
 */
export const refreshAccessToken = createAsyncThunk<
  string,
  void,
  { rejectValue: AuthError }
>('auth/refreshToken', async (_, { rejectWithValue }) => {
  try {
    const newToken = await authService.refreshToken();
    return newToken;
  } catch (error) {
    return rejectWithValue(error as AuthError);
  }
});

/**
 * Async thunk for logout
 */
export const logoutUser = createAsyncThunk<
  void,
  void,
  { rejectValue: AuthError }
>('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authService.logout();
    return;
  } catch (error) {
    return rejectWithValue(error as AuthError);
  }
});

/**
 * Async thunk for validating stored tokens on app startup
 */
export const validateStoredAuth = createAsyncThunk<
  { user: any; accessToken: string } | null,
  void,
  { rejectValue: AuthError }
>('auth/validateStored', async (_, { rejectWithValue }) => {
  try {
    const isValid = await authService.validateStoredTokens();
    
    if (isValid) {
      const [user, accessToken] = await Promise.all([
        authService.getStoredUserProfile(),
        authService.getStoredAccessToken(),
      ]);
      
      if (user && accessToken) {
        return { user, accessToken };
      }
    }
    
    return null;
  } catch (error) {
    return rejectWithValue(error as AuthError);
  }
});