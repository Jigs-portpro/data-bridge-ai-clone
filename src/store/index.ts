import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import exportDataReducer from './slices/exportDataSlice';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['exportData'],
};

const persistedExportDataReducer = persistReducer(persistConfig, exportDataReducer);

const store = configureStore({
  reducer: {
    exportData: persistedExportDataReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store; 