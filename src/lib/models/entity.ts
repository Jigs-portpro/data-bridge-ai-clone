import { ExportConfig, ExportEntity } from '@/config/exportEntities';
import mongoose, { Schema, Model } from 'mongoose';


const EntityRootSchema = new Schema<any>(
  {
    baseUrl: { type: String, required: true },
    entities: { type: Array<ExportEntity>, required: true },
  },
  { collection: 'BulkuploadEntity' }
);


const BulkuploadEntitySchema: Model<ExportConfig> = mongoose.models.BulkuploadEntity || mongoose.model<ExportConfig>('BulkuploadEntity', EntityRootSchema);

export default BulkuploadEntitySchema;


