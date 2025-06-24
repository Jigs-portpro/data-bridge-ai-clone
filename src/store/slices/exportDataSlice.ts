import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ExportDataState {
  selectedEntityId: string | null;
  fieldMappings: Record<string, string>;
  fieldMappingConfidences: Record<string, { score: number; reasoning: string } | null>;
  validationMessages: string[];
  hasValidated: boolean;
  isDataValid: boolean;
  failedRows: { row: Record<string, any>; error: string }[];
  showFailedRows: boolean;
  isRetryingFailed: boolean;
}

const initialState: ExportDataState = {
  selectedEntityId: null,
  fieldMappings: {},
  fieldMappingConfidences: {},
  validationMessages: [],
  hasValidated: false,
  isDataValid: false,
  failedRows: [],
  showFailedRows: false,
  isRetryingFailed: false,
};

const exportDataSlice = createSlice({
  name: 'exportData',
  initialState,
  reducers: {
    setSelectedEntityId(state, action: PayloadAction<string | null>) {
      state.selectedEntityId = action.payload;
    },
    setFieldMappings(state, action: PayloadAction<Record<string, string>>) {
      state.fieldMappings = action.payload;
    },
    setFieldMappingConfidences(state, action: PayloadAction<Record<string, { score: number; reasoning: string } | null>>) {
      state.fieldMappingConfidences = action.payload;
    },
    setValidationMessages(state, action: PayloadAction<string[]>) {
      state.validationMessages = action.payload;
    },
    setHasValidated(state, action: PayloadAction<boolean>) {
      state.hasValidated = action.payload;
    },
    setIsDataValid(state, action: PayloadAction<boolean>) {
      state.isDataValid = action.payload;
    },
    setFailedRows(state, action: PayloadAction<{ row: Record<string, any>; error: string }[]>) {
      state.failedRows = action.payload;
    },
    setShowFailedRows(state, action: PayloadAction<boolean>) {
      state.showFailedRows = action.payload;
    },
    setIsRetryingFailed(state, action: PayloadAction<boolean>) {
      state.isRetryingFailed = action.payload;
    },
    resetExportDataState(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setSelectedEntityId,
  setFieldMappings,
  setFieldMappingConfidences,
  setValidationMessages,
  setHasValidated,
  setIsDataValid,
  setFailedRows,
  setShowFailedRows,
  setIsRetryingFailed,
  resetExportDataState,
} = exportDataSlice.actions;

export default exportDataSlice.reducer; 