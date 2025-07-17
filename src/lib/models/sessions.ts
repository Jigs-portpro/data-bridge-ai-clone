import mongoose, { Schema, Document } from 'mongoose';

// Session Data Schema - stores uploaded file data with pagination support
export interface ISessionData extends Document {
  carrier: string | null;
  sessionId: string;
  entityName: string;
  data: Record<string, any>[];
  columns: string[];
  fileName?: string;
  sheetName?: string;
  totalRows: number;
  timestamp: Date;
  expiresAt: Date;
  mappings: Record<string, string>;
  confidences: Record<string, { score: number; reasoning: string } | null>;
}

const SessionDataSchema = new Schema<ISessionData>({
  carrier: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  entityName: { type: String, required: true, index: true },
  data: [{ type: Schema.Types.Mixed, required: true }],
  columns: [{ type: String, required: true }],
  fileName: { type: String },
  sheetName: { type: String },
  totalRows: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }, // 24 hours from now
  mappings: { type: Schema.Types.Mixed, default: {} },
  confidences: { type: Schema.Types.Mixed, default: {} }
});

// Compound index for efficient queries
SessionDataSchema.index({ sessionId: 1, entityName: 1 }, { unique: true });

// TTL index for automatic cleanup
SessionDataSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Metadata Schema - stores validation state, error information, and edited cells
export interface IMetadata extends Document {
  sessionId: string;
  entityName: string;
  columns: string[];
  totalRows: number;
  datatableEditedCells: string[];
  errorRows: number[];
  errorCells: Record<string, string[]>;
  errorMessages: Record<string, string>;
  hasValidated: boolean;
  validationMessages: string[];
  organizedData?: Record<string, any>[];
  timestamp: Date;
  expiresAt: Date;
  carrier: string | null;
}

const MetadataSchema = new Schema<IMetadata>({
  sessionId: { type: String, required: true, index: true },
  entityName: { type: String, required: true, index: true },
  columns: [{ type: String, required: true }],
  totalRows: { type: Number, required: true },
  datatableEditedCells: [{ type: String, default: [] }],
  errorRows: [{ type: Number, default: [] }],
  errorCells: { type: Schema.Types.Mixed, default: {} },
  errorMessages: { type: Schema.Types.Mixed, default: {} },
  hasValidated: { type: Boolean, default: false },
  validationMessages: [{ type: String, default: [] }],
  organizedData: [{ type: Schema.Types.Mixed }],
  timestamp: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }, // 24 hours from now
  carrier: { type: String, required: true, index: true }
});

// Compound index for efficient queries
MetadataSchema.index({ sessionId: 1, entityName: 1 }, { unique: true });

// TTL index for automatic cleanup
MetadataSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Lookup Cache Schema - stores lookup data for various entities
export interface ILookupCache extends Document {
  sessionId: string;
  lookupType: string;
  data: any[];
  lastFetched: Date;
  expiresAt: Date;
}

const LookupCacheSchema = new Schema<ILookupCache>({
  sessionId: { type: String, required: true, index: true },
  lookupType: { type: String, required: true, index: true },
  data: [{ type: Schema.Types.Mixed }],
  lastFetched: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) } // 24 hours from now
});

// Compound index for efficient queries
LookupCacheSchema.index({ sessionId: 1, lookupType: 1 }, { unique: true });

// TTL index for automatic cleanup
LookupCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Abort Signal Schema - stores abort signals for chat processes
export interface IAbortSignal extends Document {
  sessionId: string;
  entitySessionId: string;
  aborted: boolean;
  reason?: string;
  timestamp: Date;
  expiresAt: Date;
}

const AbortSignalSchema = new Schema<IAbortSignal>({
  sessionId: { type: String, required: true, index: true },
  entitySessionId: { type: String, required: true, index: true },
  aborted: { type: Boolean, default: true },
  reason: { type: String },
  timestamp: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 5 * 60 * 1000) } // 5 minutes from now
});

// Compound index for efficient queries
AbortSignalSchema.index({ sessionId: 1, entitySessionId: 1 }, { unique: true });

// TTL index for automatic cleanup
AbortSignalSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create models
export const SessionData = mongoose.models.BulkuploadSessions || mongoose.model<ISessionData>('BulkuploadSessions', SessionDataSchema);
export const Metadata = mongoose.models.BulkuploadMetadata || mongoose.model<IMetadata>('BulkuploadMetadata', MetadataSchema);
export const LookupCache = mongoose.models.BulkuploadLookupCache || mongoose.model<ILookupCache>('BulkuploadLookupCache', LookupCacheSchema);
export const AbortSignal = mongoose.models.BulkuploadAbortSignal || mongoose.model<IAbortSignal>('BulkuploadAbortSignal', AbortSignalSchema);

// Helper functions to generate MongoDB document IDs
export const generateSessionDataId = (sessionId: string, entityName: string) => {
  return `${sessionId}-ENTITY-${entityName}`;
};

export const generateAbortKey = (sessionId: string, entitySessionId: string) => {
  return `${sessionId}-${entitySessionId}`;
}; 