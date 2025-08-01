import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile, AuthState, AuthError } from '@/types';
import { 
  authenticateUser, 
  refreshAccessToken, 
  logoutUser, 
  validateStoredAuth 
} from '../thunks/authThunks';

const initialState: AuthState = {
  isAuthenticated: false,
  isLocalMode: false,
  user: null,
  accessToken: null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setLocalMode: (state, action: PayloadAction<boolean>) => {
      state.isLocalMode = action.payload;
      if (action.payload) {
        // In local mode, we consider the user "authenticated" for navigation purposes
        state.isAuthenticated = true;
        state.user = {
          id: 'local-user',
          email: 'local@device.com',
          name: 'Local User',
          quotaUsed: 0,
          quotaLimit: 0,
        };
        state.accessToken = null;
        state.error = null;
      }
    },
  },
  extraReducers: builder => {
    // Authenticate user
    builder
      .addCase(authenticateUser.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(authenticateUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(authenticateUser.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.isLoading = false;
        state.error = action.payload || null;
      });

    // Refresh token
    builder
      .addCase(refreshAccessToken.pending, state => {
        state.error = null;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.accessToken = action.payload;
        state.error = null;
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        state.error = action.payload || null;
        // If refresh fails, user needs to re-authenticate
        if (action.payload?.type === 'token_expired') {
          state.isAuthenticated = false;
          state.user = null;
          state.accessToken = null;
        }
      });

    // Logout user
    builder
      .addCase(logoutUser.pending, state => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, state => {
        state.isAuthenticated = false;
        state.isLocalMode = false;
        state.user = null;
        state.accessToken = null;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        // Even if logout fails, clear the state
        state.isAuthenticated = false;
        state.isLocalMode = false;
        state.user = null;
        state.accessToken = null;
        state.isLoading = false;
        state.error = action.payload || null;
      });

    // Validate stored auth
    builder
      .addCase(validateStoredAuth.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(validateStoredAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
        } else {
          state.isAuthenticated = false;
          state.user = null;
          state.accessToken = null;
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(validateStoredAuth.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.isLoading = false;
        state.error = action.payload || null;
      });
  },
});

export const { 
  clearError,
  setLoading,
  setLocalMode
} = authSlice.actions;
export default authSlice.reducer;
