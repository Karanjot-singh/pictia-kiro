import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import organizationSlice from './slices/organizationSlice';
import backupSlice from './slices/backupSlice';
import notificationSlice from './slices/notificationSlice';
import settingsSlice from './slices/settingsSlice';
import { baseApi } from './api/baseApi';
import { googlePhotosApi } from './api/googlePhotosApi';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    organization: organizationSlice,
    backup: backupSlice,
    notification: notificationSlice,
    settings: settingsSlice,
    [baseApi.reducerPath]: baseApi.reducer,
    [googlePhotosApi.reducerPath]: googlePhotosApi.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // All our auth errors are now serializable
      },
    }).concat(baseApi.middleware, googlePhotosApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
