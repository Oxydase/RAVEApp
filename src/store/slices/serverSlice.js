import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  ipAddress: '',
  port: '5000',
  isConnected: false,
  availableModels: [],
  selectedModel: '',
  isLoading: false,
  error: null,
};

const serverSlice = createSlice({
  name: 'server',
  initialState,
  reducers: {
    setServerConfig: (state, action) => {
      state.ipAddress = action.payload.ipAddress;
      state.port = action.payload.port;
    },
    setConnectionStatus: (state, action) => {
      state.isConnected = action.payload;
    },
    setAvailableModels: (state, action) => {
      state.availableModels = action.payload;
    },
    setSelectedModel: (state, action) => {
      state.selectedModel = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  setServerConfig,
  setConnectionStatus,
  setAvailableModels,
  setSelectedModel,
  setLoading,
  setError,
} = serverSlice.actions;

export default serverSlice.reducer;