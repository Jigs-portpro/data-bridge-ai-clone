import moment from 'moment';
import 'moment-timezone';
import { API_RESPONSE_STORAGE_KEY } from '@/lib/constants';

// Define the date fields for each entity that need conversion to ISO 8601
const ENTITY_DATE_FIELDS = {
  'Trucks': [
    'AID',
    'ITD', 
    'reg_expiration',
    'inspection_exp',
    'hut_exp',
    'annual_inspection',
    'bobtail_insurance',
    'diesel_emission'
  ],
  'Drivers': [
    'dlExp',           
    'dob',       
    'doh',      
    'medicalExp',     
    'twicExp',     
    'seaLinkExp'       
  ]
};

/**
 * Gets the timezone from stored API response
 * @returns The timezone string or 'America/Los_Angeles' as default
 */
function getStoredTimezone(): string {
  if (typeof window === 'undefined') {
    return 'America/Los_Angeles';
  }

  try {
    const apiResponse = localStorage.getItem(API_RESPONSE_STORAGE_KEY);
    if (apiResponse) {
      const parsed = JSON.parse(apiResponse);
      return parsed.data?.user?.homeTerminalTimezone || 'America/Los_Angeles';
    }
  } catch (error) {
    console.error('Error reading timezone from storage:', error);
  }

  return 'America/Los_Angeles';
}

/**
 * Converts a date string to ISO 8601 format with timezone conversion
 * @param dateString - The date string to convert
 * @returns ISO 8601 formatted date string or null if invalid
 */
function convertToISO8601(dateString: string): string | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  // Check if it's already in ISO 8601 format
  if (dateString.includes('T') && dateString.includes('Z')) {
    return dateString;
  }

  const timezone = getStoredTimezone();

  // Try to parse with different formats
  const formats = [
    'YYYY-MM-DD',
    'MM-DD-YYYY', 
    'MM/DD/YYYY',
    'DD-MMM-YY',
    'DD-MMM-YYYY'
  ];

  for (const format of formats) {
    const parsed = moment.tz(dateString, format, timezone);
    if (parsed.isValid()) {
      return parsed.utc().toISOString();
    }
  }

  return null;
}

/**
 * Converts date fields in data for a specific entity to ISO 8601 format
 * @param entityName - The name of the entity (e.g., 'Trucks')
 * @param data - The data object containing the fields
 * @returns The data object with converted dates
 */
export function convertEntityDates(entityName: string, data: Record<string, any>): Record<string, any> {
  const dateFields = ENTITY_DATE_FIELDS[entityName as keyof typeof ENTITY_DATE_FIELDS];
  
  if (!dateFields) {
    console.warn(`No date fields configured for entity: ${entityName}`);
    return data;
  }

  const convertedData = { ...data };

  for (const field of dateFields) {
    if (convertedData[field] && typeof convertedData[field] === 'string') {
      const converted = convertToISO8601(convertedData[field]);
      if (converted) {
        convertedData[field] = converted;
      }
    }
  }

  return convertedData;
}
