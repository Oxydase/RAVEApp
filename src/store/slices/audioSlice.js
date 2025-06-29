import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  originalAudio: null,
  transformedAudio: null,
  isProcessing: false,
  selectedAudioSource: 'default', // 'default', 'recorded', 'file'
  selectedAudioFile: null,
};

const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    setOriginalAudio: (state, action) => {
      state.originalAudio = action.payload;
    },
    setTransformedAudio: (state, action) => {
      state.transformedAudio = action.payload;
    },
    setProcessingStatus: (state, action) => {
      state.isProcessing = action.payload;
    },
    setSelectedAudioSource: (state, action) => {
      state.selectedAudioSource = action.payload;
    },
    setSelectedAudioFile: (state, action) => {
      state.selectedAudioFile = action.payload;
    },
    resetAudio: (state) => {
      state.originalAudio = null;
      state.transformedAudio = null;
      state.isProcessing = false;
    },
  },
});

export const {
  setOriginalAudio,
  setTransformedAudio,
  setProcessingStatus,
  setSelectedAudioSource,
  setSelectedAudioFile,
  resetAudio,
} = audioSlice.actions;

export default audioSlice.reducer;