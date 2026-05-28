import { configureStore } from '@reduxjs/toolkit';
import userReducer     from './slices/userSlice';
import tripReducer     from './slices/tripSlice';
import earningsReducer from './slices/earningsSlice';

const store = configureStore({
  reducer: {
    user:     userReducer,
    trip:     tripReducer,
    earnings: earningsReducer,
  },
});

export default store;