/**
 * Generates a random password with specified maximum length
 * @param maxLength - Maximum length of the password
 * @returns A random password string
 */
export const generateRandomPassword = (maxLength: number): string => {
  // Define character sets
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  // Ensure at least one character from each set
  let password = '';
  password += uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)];
  password += lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)];
  password += numberChars[Math.floor(Math.random() * numberChars.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];

  // Combine all character sets
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;

  // Fill the rest of the password up to maxLength
  const remainingLength = maxLength - password.length;
  for (let i = 0; i < remainingLength; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password to ensure random distribution
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

/**
 * Validates if a password meets the requirements
 * @param password - Password to validate
 * @param maxLength - Maximum length of the password
 * @returns boolean indicating if password is valid
 */
export const validatePassword = (password: string, maxLength: number): boolean => {
  if (!password || password.length > maxLength) return false;

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

  return hasUppercase && hasLowercase && hasNumber && hasSpecial;
};

export const clearAllExportState = (dispatch?: any, clearValidationState: boolean = true) => {
  // Clear all validation state from localStorage
  if (typeof window !== 'undefined') {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('validationState_') || 
          key.startsWith('columnMapping_') || 
          key.startsWith('columnMappingConfidence_') ||
          key.startsWith('persist:root')) {
        localStorage.removeItem(key);
      }
    });
  }
  
  // Clear Redux state if dispatch is provided and validation state should be cleared
  if (dispatch && clearValidationState) {
    dispatch({ type: 'exportData/resetExportDataState' });
  }
  
  console.log('Export state clearing utility called - Redux state should be cleared via dispatch');
};

/**
 * Transform customer type values into user-friendly labels
 * @param customerType - The raw customer type value (can be string or array)
 * @returns User-friendly label
 */
export function transformCustomerType(customerType: string | string[] | null | undefined): string {
  if (!customerType) return '';
  
  // Handle array case
  if (Array.isArray(customerType)) {
    if (customerType.length === 0) return '';
    
    // Special handling for Yard types
    const hasChassisTermination = customerType.includes('chassisTermination');
    const hasChassisPick = customerType.includes('chassisPick');
    
    // Special handling for Terminal types
    const hasShipper = customerType.includes('shipper');
    const hasContainerReturn = customerType.includes('containerReturn');
    
    let resultLabels: string[] = [];
    let remainingTypes = [...customerType];
    
    // If both chassisTermination and chassisPick are present, add "Yard"
    if (hasChassisTermination && hasChassisPick) {
      resultLabels.push('Yard');
      remainingTypes = remainingTypes.filter(type => type !== 'chassisTermination' && type !== 'chassisPick');
    }
    
    // If both shipper and containerReturn are present, add "Terminal"
    if (hasShipper && hasContainerReturn) {
      resultLabels.push('Terminal');
      remainingTypes = remainingTypes.filter(type => type !== 'shipper' && type !== 'containerReturn');
    }
    
    // Add individual labels for remaining types
    const individualLabels = remainingTypes.map(type => getCustomerTypeLabel(type));
    resultLabels.push(...individualLabels);
    
    return resultLabels.join(', ');
  }
  
  // Handle string case
  return getCustomerTypeLabel(customerType);
}

/**
 * Get user-friendly label for a single customer type
 * @param type - The raw customer type
 * @returns User-friendly label
 */
function getCustomerTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    'caller': 'Customer',
    'shipper': 'Shipper',
    'containerReturn': 'Container Return',
    'consignee': 'Warehouse',
    'chassisTermination': 'Chassis Termination',
    'chassisPick': 'Chassis Pick',
    'ALL': 'All Types'
  };
  
  return typeMap[type] || type;
}

/**
 * Get an array of user-friendly customer type labels for badge rendering
 */
export function getCustomerTypeLabels(customerType: string | string[] | null | undefined): string[] {
  if (!customerType) return [];
  if (Array.isArray(customerType)) {
    if (customerType.length === 0) return [];
    const hasChassisTermination = customerType.includes('chassisTermination');
    const hasChassisPick = customerType.includes('chassisPick');
    const hasShipper = customerType.includes('shipper');
    const hasContainerReturn = customerType.includes('containerReturn');
    let resultLabels: string[] = [];
    let remainingTypes = [...customerType];
    if (hasChassisTermination && hasChassisPick) {
      resultLabels.push('Yard');
      remainingTypes = remainingTypes.filter(type => type !== 'chassisTermination' && type !== 'chassisPick');
    }
    if (hasShipper && hasContainerReturn) {
      resultLabels.push('Terminal');
      remainingTypes = remainingTypes.filter(type => type !== 'shipper' && type !== 'containerReturn');
    }
    const individualLabels = remainingTypes.map(type => getCustomerTypeLabel(type));
    resultLabels.push(...individualLabels);
    return resultLabels;
  }
  return [getCustomerTypeLabel(customerType)];
}
