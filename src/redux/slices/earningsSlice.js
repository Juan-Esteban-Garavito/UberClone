import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  totalEarnings: 0,       // ganancias acumuladas de la sesión
  tripsCompleted: 0,      // carreras completadas
  history: [],            // array de carreras completadas
};

const earningsSlice = createSlice({
  name: 'earnings',
  initialState,
  reducers: {
    addTrip(state, action) {
      // action.payload: { passenger, origin, destination, fare, distKm, date, userType }
      state.history.unshift(action.payload);   // más reciente primero
      if (action.payload.userType === 'driver') {
        state.totalEarnings += action.payload.fare;
        state.tripsCompleted += 1;
      }
    },
    resetEarnings() {
      return initialState;
    },
  },
});

export const { addTrip, resetEarnings } = earningsSlice.actions;
export default earningsSlice.reducer;