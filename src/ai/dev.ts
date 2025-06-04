
import { config } from 'dotenv';
config();

import '@/ai/flows/data-correction-suggestions.ts';
import '@/ai/flows/duplicate-detection.ts';
import '@/ai/flows/chat-interface-updates.ts';
import '@/ai/flows/anomaly-report.ts';
import '@/ai/flows/intelligent-column-reordering.ts';
import '@/ai/flows/data-enrichment.ts';
import '@/ai/flows/auto-column-mapping.ts';
import '@/ai/flows/process-address-flow.ts'; // Added new flow
