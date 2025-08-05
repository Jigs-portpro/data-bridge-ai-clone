import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ExportDataState {
  selectedEntityId: string | null;
  fieldMappings: Record<string, string>;
  fieldMappingConfidences: Record<string, { score: number; reasoning: string } | null>;
  validationMessages: string[];
  hasValidated: boolean;
  isDataValid: boolean;
  failedRows: { row: Record<string, any>; error: string; isEmailConflict?: boolean; emailField?: string; emailValue?: string }[];
  showFailedRows: boolean;
  isRetryingFailed: boolean;
  // Error highlighting state - using serializable structures
  errorRows: number[]; // Array of row indices instead of Set
  errorCells: Record<string, string[]>; // Object with column names as keys and arrays of row indices as values
  errorMessages: Record<string, string>; // Object with error keys as keys and messages as values
  organizedData: any[]; // Data organized with errors first, then valid rows
  totalErrorCount: number; // Add this new field
  // Page validation tracking
  pageValidationStatus: Record<number, { isValid: boolean; errorCount: number; errorRows?: number[] }>; // Track validation status per page with error rows
  totalPages: number; // Total number of pages in the dataset
  allPagesValidated: boolean; // Whether all pages have been validated successfully
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
  errorRows: [],
  errorCells: {},
  errorMessages: {},
  organizedData: [],
  totalErrorCount: 0, // Add this initial value
  // Page validation tracking
  pageValidationStatus: {},
  totalPages: 0,
  allPagesValidated: false,
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
    setFailedRows(state, action: PayloadAction<{ row: Record<string, any>; error: string; isEmailConflict?: boolean; emailField?: string; emailValue?: string }[]>) {
      state.failedRows = action.payload;
    },
    setShowFailedRows(state, action: PayloadAction<boolean>) {
      state.showFailedRows = action.payload;
    },
    setIsRetryingFailed(state, action: PayloadAction<boolean>) {
      state.isRetryingFailed = action.payload;
    },
    setErrorRows(state, action: PayloadAction<number[]>) {
      state.errorRows = action.payload;
    },
    setErrorCells(state, action: PayloadAction<Record<string, string[]>>) {
      state.errorCells = action.payload;
    },
    setErrorMessages(state, action: PayloadAction<Record<string, string>>) {
      state.errorMessages = action.payload;
    },
    setOrganizedData(state, action: PayloadAction<any[]>) {
      state.organizedData = action.payload;
    },
    setTotalErrorCount(state, action: PayloadAction<number>) {
      state.totalErrorCount = action.payload;
    },
    setPageValidationStatus(state, action: PayloadAction<{ page: number; isValid: boolean; errorCount: number; errorRows?: number[] }>) {
      const { page, isValid, errorCount, errorRows } = action.payload;
      state.pageValidationStatus[page] = { isValid, errorCount, errorRows };
      
      // Check if all pages are validated and valid
      const validatedPages = Object.keys(state.pageValidationStatus).length;
      const allValid = Object.values(state.pageValidationStatus).every(status => status.isValid);
      state.allPagesValidated = validatedPages === state.totalPages && allValid;
    },
    setTotalPages(state, action: PayloadAction<number>) {
      state.totalPages = action.payload;
    },
    resetPageValidation(state) {
      state.pageValidationStatus = {};
      state.allPagesValidated = false;
      state.hasValidated = false;
      state.isDataValid = false;
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
  setErrorRows,
  setErrorCells,
  setErrorMessages,
  setOrganizedData,
  setTotalErrorCount, // Add this to exports
  setPageValidationStatus,
  setTotalPages,
  resetPageValidation,
  resetExportDataState,
} = exportDataSlice.actions;

export default exportDataSlice.reducer; 