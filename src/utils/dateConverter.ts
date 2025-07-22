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

// Date patterns that need conversion
const DATE_PATTERNS = [
  /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/, // YYYY-MM-DD
  /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-[0-9]{4}$/, // MM-DD-YYYY
  /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/[0-9]{4}$/, // MM/DD/YYYY
  /^(0[1-9]|[12][0-9]|3[01])-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-[0-9]{2}$/, // DD-MMM-YY
  /^(0[1-9]|[12][0-9]|3[01])-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-[0-9]{4}$/ // DD-MMM-YYYY
];

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
export function convertToISO8601(dateString: string): string | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  // Check if it's already in ISO 8601 format (with T and Z)
  if (dateString.includes('T') && dateString.includes('Z')) {
    return dateString;
  }

  const timezone = getStoredTimezone();

  // Check if it's in YYYY-MM-DD format and convert to ISO 8601
  if (moment(dateString, 'YYYY-MM-DD', true).isValid()) {
    // Parse the date in the specified timezone and convert to UTC
    return moment.tz(dateString, 'YYYY-MM-DD', timezone).utc().toISOString();
  }

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
      // Convert to UTC
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

/**
 * Converts date fields in an array of data objects for a specific entity
 * @param entityName - The name of the entity (e.g., 'Trucks')
 * @param dataArray - Array of data objects
 * @returns Array of data objects with converted dates
 */
export function convertEntityDatesArray(entityName: string, dataArray: Record<string, any>[]): Record<string, any>[] {
  return dataArray.map(data => convertEntityDates(entityName, data));
}

/**
 * Adds a new entity to the date conversion configuration
 * @param entityName - The name of the entity
 * @param dateFields - Array of field names that contain dates
 */
export function addEntityDateFields(entityName: string, dateFields: string[]): void {
  ENTITY_DATE_FIELDS[entityName as keyof typeof ENTITY_DATE_FIELDS] = dateFields;
}

/**
 * Gets the current configured entities and their date fields
 * @returns Object containing entity names and their date fields
 */
export function getConfiguredEntities(): Record<string, string[]> {
  return { ...ENTITY_DATE_FIELDS };
}

/**
 * Validates if a date string matches any of the supported patterns
 * @param dateString - The date string to validate
 * @returns True if the date string matches a supported pattern
 */
export function isValidDateFormat(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  // Check if it's already in ISO 8601 format
  if (moment(dateString, moment.ISO_8601, true).isValid()) {
    return true;
  }

  // Check against our patterns
  return DATE_PATTERNS.some(pattern => pattern.test(dateString));
}
