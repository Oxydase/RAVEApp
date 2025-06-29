import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  recordings: [], // { id, name, uri, duration, createdAt }
  currentRecording: null,
  isRecording: false,
  isPlaying: false,
};

const recordingsSlice = createSlice({
  name: 'recordings',
  initialState,
  reducers: {
    addRecording: (state, action) => {
      state.recordings.push(action.payload);
    },
    removeRecording: (state, action) => {
      state.recordings = state.recordings.filter(
        recording => recording.id !== action.payload
      );
    },
    setCurrentRecording: (state, action) => {
      state.currentRecording = action.payload;
    },
    setRecordingStatus: (state, action) => {
      state.isRecording = action.payload;
    },
    setPlayingStatus: (state, action) => {
      state.isPlaying = action.payload;
    },
  },
});

export const {
  addRecording,
  removeRecording,
  setCurrentRecording,
  setRecordingStatus,
  setPlayingStatus,
} = recordingsSlice.actions;

export default recordingsSlice.reducer;