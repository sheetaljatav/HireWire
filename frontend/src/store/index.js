import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import interviewReducer from './slices/interviewSlice'
import userReducer from './slices/userSlice'
import uiReducer from './slices/uiSlice'

const rootReducer = combineReducers({
  interview: interviewReducer,
  user: userReducer,
  ui: uiReducer,
})

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['interview', 'user'],
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }),
})

export const persistor = persistStore(store)

export default store



