import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import organizationSlice from './slices/organizationSlice';
import backupSlice from './slices/backupSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    organization: organizationSlice,
    backup: backupSlice,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
