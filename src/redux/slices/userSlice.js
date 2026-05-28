import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  uid: null,
  name: '',
  email: '',
  phone: '',
  gender: '',
  language: 'es',
  photo: null,
  userType: null,
  isLoggedIn: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action) {
      return { ...state, ...action.payload, isLoggedIn: true };
    },
    clearUser() {
      return initialState;
    },
    updateProfile(state, action) {
      return { ...state, ...action.payload };
    },
  },
});

export const { setUser, clearUser, updateProfile } = userSlice.actions;
export default userSlice.reducer;