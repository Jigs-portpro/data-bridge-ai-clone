import moment from 'moment';
import 'moment-timezone';

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
    const apiResponse = localStorage.getItem('API_RESPONSE_STORAGE_KEY');
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
 * Validates if a date string is valid using moment.js with multiple format support
 * @param dateString - The date string to validate
 * @returns boolean indicating if the date is valid
 */
export function isValidDateString(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  // Common date formats to try
  const formats = [
    'MM-DD-YYYY',
    'MM/DD/YYYY', 
    'YYYY-MM-DD',
    'DD-MM-YYYY',
    'DD/MM/YYYY',
    'YYYY/MM/DD',
    'MM-DD-YY',
    'MM/DD/YY',
    'YY-MM-DD',
    'YY/MM/DD',
    'DD-MM-YY',
    'DD/MM/YY',
    'YYYY-MM-DDTHH:mm:ss.SSSZ', // ISO format
    'YYYY-MM-DDTHH:mm:ssZ',
    'YYYY-MM-DDTHH:mm:ss',
    'YYYY-MM-DD HH:mm:ss',
    'MM/DD/YYYY HH:mm:ss',
    'MM-DD-YYYY HH:mm:ss'
  ];

  const timezone = getStoredTimezone();

  // First, try to detect the format more intelligently
  const parts = dateString.split(/[\/\-]/);
  if (parts.length === 3) {
    const [first, second, third] = parts.map(p => parseInt(p, 10));
    
    // Check if it's YYYY-MM-DD or YYYY/MM/DD format (year is first)
    if (first >= 1900 && first <= 2100 && second >= 1 && second <= 12 && third >= 1 && third <= 31) {
      const yyyyFormat = dateString.includes('/') ? 'YYYY/MM/DD' : 'YYYY-MM-DD';
      const parsed = moment.tz(dateString, yyyyFormat, timezone);
      if (parsed.isValid()) {
        return true;
      }
    }
    
    // Check if it's YYYY-DD-MM or YYYY/DD/MM format (year is first, day is second)
    if (first >= 1900 && first <= 2100 && second >= 1 && second <= 31 && third >= 1 && third <= 12) {
      const yyyyFormat = dateString.includes('/') ? 'YYYY/DD/MM' : 'YYYY-DD-MM';
      const parsed = moment.tz(dateString, yyyyFormat, timezone);
      if (parsed.isValid()) {
        return true;
      }
    }
    
    // Validate basic date constraints for other formats
    if (first < 1 || second < 1 || third < 1) return false;
    if (second > 12) return false; // Invalid month
    if (first > 31) return false; // Invalid day
    
    // If first part is > 12, it's likely DD/MM/YYYY or DD-MM-YYYY
    if (first > 12 && first <= 31 && second <= 12) {
      const ddFormat = dateString.includes('/') ? 'DD/MM/YYYY' : 'DD-MM-YYYY';
      const parsed = moment.tz(dateString, ddFormat, timezone);
      if (parsed.isValid()) {
        return true;
      }
    }
    
    // If second part is > 12, it's likely MM/DD/YYYY or MM-DD-YYYY
    if (second > 12 && second <= 31 && first <= 12) {
      const mmFormat = dateString.includes('/') ? 'MM/DD/YYYY' : 'MM-DD-YYYY';
      const parsed = moment.tz(dateString, mmFormat, timezone);
      if (parsed.isValid()) {
        return true;
      }
    }
    
    // Try both DD/MM and MM/DD formats for ambiguous cases
    const ddFormat = dateString.includes('/') ? 'DD/MM/YYYY' : 'DD-MM-YYYY';
    const mmFormat = dateString.includes('/') ? 'MM/DD/YYYY' : 'MM-DD-YYYY';
    
    const parsedDD = moment.tz(dateString, ddFormat, timezone);
    const parsedMM = moment.tz(dateString, mmFormat, timezone);
    
    if (parsedDD.isValid()) return true;
    if (parsedMM.isValid()) return true;
  }

  // Try all formats
  for (const format of formats) {
    const parsed = moment.tz(dateString, format, timezone);
    if (parsed.isValid()) {
      return true;
    }
  }

  // Try parsing as ISO string
  const isoParsed = moment(dateString);
  if (isoParsed.isValid()) {
    return true;
  }

  return false;
}

/**
 * Converts a date string to the required format for payload
 * @param dateString - The date string to convert
 * @param targetFormat - The target format (default: 'MM-DD-YYYY')
 * @returns Formatted date string or null if invalid
 */
export function convertDateForPayload(dateString: string, targetFormat: string = 'MM-DD-YYYY'): string | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const timezone = getStoredTimezone();

  // First, try to detect the format more intelligently
  const parts = dateString.split(/[\/\-]/);
  if (parts.length === 3) {
    const [first, second, third] = parts.map(p => parseInt(p, 10));
    
    // Check if it's YYYY-MM-DD or YYYY/MM/DD format (year is first)
    if (first >= 1900 && first <= 2100 && second >= 1 && second <= 12 && third >= 1 && third <= 31) {
      const yyyyFormat = dateString.includes('/') ? 'YYYY/MM/DD' : 'YYYY-MM-DD';
      const parsed = moment.tz(dateString, yyyyFormat, timezone);
      if (parsed.isValid()) {
        return parsed.format(targetFormat);
      }
    }
    
    // Check if it's YYYY-DD-MM or YYYY/DD/MM format (year is first, day is second)
    if (first >= 1900 && first <= 2100 && second >= 1 && second <= 31 && third >= 1 && third <= 12) {
      const yyyyFormat = dateString.includes('/') ? 'YYYY/DD/MM' : 'YYYY-DD-MM';
      const parsed = moment.tz(dateString, yyyyFormat, timezone);
      if (parsed.isValid()) {
        return parsed.format(targetFormat);
      }
    }
    
    // Validate basic date constraints for other formats
    if (first < 1 || second < 1 || third < 1) return null;
    if (second > 12) return null; // Invalid month
    if (first > 31) return null; // Invalid day
    
    // If first part is > 12, it's likely DD/MM/YYYY or DD-MM-YYYY
    if (first > 12 && first <= 31 && second <= 12) {
      const ddFormat = dateString.includes('/') ? 'DD/MM/YYYY' : 'DD-MM-YYYY';
      const parsed = moment.tz(dateString, ddFormat, timezone);
      if (parsed.isValid()) {
        return parsed.format(targetFormat);
      }
    }
    
    // If second part is > 12, it's likely MM/DD/YYYY or MM-DD-YYYY
    if (second > 12 && second <= 31 && first <= 12) {
      const mmFormat = dateString.includes('/') ? 'MM/DD/YYYY' : 'MM-DD-YYYY';
      const parsed = moment.tz(dateString, mmFormat, timezone);
      if (parsed.isValid()) {
        return parsed.format(targetFormat);
      }
    }
    
    // Try both DD/MM and MM/DD formats for ambiguous cases
    const ddFormat = dateString.includes('/') ? 'DD/MM/YYYY' : 'DD-MM-YYYY';
    const mmFormat = dateString.includes('/') ? 'MM/DD/YYYY' : 'MM-DD-YYYY';
    
    const parsedDD = moment.tz(dateString, ddFormat, timezone);
    const parsedMM = moment.tz(dateString, mmFormat, timezone);
    
    if (parsedDD.isValid()) return parsedDD.format(targetFormat);
    if (parsedMM.isValid()) return parsedMM.format(targetFormat);
  }

  // Common date formats to try
  const formats = [
    'MM-DD-YYYY',
    'MM/DD/YYYY', 
    'YYYY-MM-DD',
    'DD-MM-YYYY',
    'DD/MM/YYYY',
    'YYYY/MM/DD',
    'MM-DD-YY',
    'MM/DD/YY',
    'YY-MM-DD',
    'YY/MM/DD',
    'DD-MM-YY',
    'DD/MM/YY',
    'YYYY-MM-DDTHH:mm:ss.SSSZ',
    'YYYY-MM-DDTHH:mm:ssZ',
    'YYYY-MM-DDTHH:mm:ss',
    'YYYY-MM-DD HH:mm:ss',
    'MM/DD/YYYY HH:mm:ss',
    'MM-DD-YYYY HH:mm:ss'
  ];

  for (const format of formats) {
    const parsed = moment.tz(dateString, format, timezone);
    if (parsed.isValid()) {
      return parsed.format(targetFormat);
    }
  }

  // Try parsing as ISO string
  const isoParsed = moment(dateString);
  if (isoParsed.isValid()) {
    return isoParsed.format(targetFormat);
  }

  return null;
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
 * Gets the appropriate date format for a specific entity and field
 * @param entityId - The entity ID
 * @param fieldName - The field name
 * @returns The target date format
 */
export function getDateFormatForField(entityId: string, fieldName: string): string {
  // Default format for most date fields
  let targetFormat = 'MM-DD-YYYY';

  // Special cases based on entity and field
  switch (entityId) {
    case 'Tariff':
    case 'Charge Profile':
      if (fieldName.includes('Effective')) {
        targetFormat = 'MM/DD/YYYY';
      }
      break;
    case 'Trailers':
    case 'Trucks':
    case 'Chassis':
    case 'Drivers':
      targetFormat = 'YYYY-MM-DD';
      break;
    default:
      targetFormat = 'MM-DD-YYYY';
  }

  return targetFormat;
}

/**
 * Validates and converts date for a specific entity field
 * @param dateString - The date string to validate and convert
 * @param entityId - The entity ID
 * @param fieldName - The field name
 * @returns Object with validation result and converted date
 */
export function validateAndConvertDate(dateString: string, entityId: string, fieldName: string): {
  isValid: boolean;
  convertedDate: string | null;
  errorMessage?: string;
} {
  if (!dateString || typeof dateString !== 'string') {
    return {
      isValid: false,
      convertedDate: null,
      errorMessage: 'Date is required'
    };
  }

  if (!isValidDateString(dateString)) {
    // Provide more specific error messages
    const parts = dateString.split(/[\/\-]/);
    let specificError = '';
    
    if (parts.length === 3) {
      const [first, second, third] = parts.map(p => parseInt(p, 10));
      
      // Check if it's YYYY-MM-DD format first
      if (first >= 1900 && first <= 2100 && second >= 1 && second <= 12 && third >= 1 && third <= 31) {
        // This looks like YYYY-MM-DD format, but moment.js couldn't parse it
        specificError = `Invalid date in YYYY-MM-DD format`;
      } else if (first >= 1900 && first <= 2100 && second >= 1 && second <= 31 && third >= 1 && third <= 12) {
        // This looks like YYYY-DD-MM format, but moment.js couldn't parse it
        specificError = `Invalid date in YYYY-DD-MM format`;
      } else if (second > 12) {
        specificError = `Invalid month: ${second} (months must be 1-12)`;
      } else if (first > 31) {
        specificError = `Invalid day: ${first} (days must be 1-31)`;
      } else if (first < 1 || second < 1 || third < 1) {
        specificError = `Invalid date components (all parts must be positive numbers)`;
      } else {
        specificError = `Invalid date format`;
      }
    } else {
      specificError = `Invalid date format`;
    }
    
    return {
      isValid: false,
      convertedDate: null,
      errorMessage: `${specificError}. Supported formats: MM-DD-YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, DD-MM-YY, DD/MM/YY. Found: "${dateString}"`
    };
  }

  const targetFormat = getDateFormatForField(entityId, fieldName);
  const convertedDate = convertDateForPayload(dateString, targetFormat);

  if (!convertedDate) {
    return {
      isValid: false,
      convertedDate: null,
      errorMessage: `Failed to convert date to required format: ${targetFormat}`
    };
  }

  return {
    isValid: true,
    convertedDate
  };
} 