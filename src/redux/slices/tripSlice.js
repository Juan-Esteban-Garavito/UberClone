import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  origin: null,
  destination: null,
  selectedVehicle: null,
  estimatedFare: 0,
  status: 'idle',
  driver: null,
  rating: null,
  tripId: null,
};

const tripSlice = createSlice({
  name: 'trip',
  initialState,
  reducers: {
    setOrigin(state, action) { state.origin = action.payload; },
    setDestination(state, action) { state.destination = action.payload; },
    setVehicle(state, action) { state.selectedVehicle = action.payload; },
    setFare(state, action) { state.estimatedFare = action.payload; },
    setStatus(state, action) { state.status = action.payload; },
    setDriver(state, action) { state.driver = action.payload; },
    setRating(state, action) { state.rating = action.payload; },
    setTripId(state, action) { state.tripId = action.payload; },
    clearTrip() { return initialState; },
  },
});

export const {
  setOrigin, setDestination, setVehicle, setFare,
  setStatus, setDriver, setRating, setTripId, clearTrip,
} = tripSlice.actions;
export default tripSlice.reducer;