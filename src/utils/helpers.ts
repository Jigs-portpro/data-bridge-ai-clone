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

export const clearAllExportState = () => {
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
  
  console.log('Export state clearing utility called - Redux state should be cleared via dispatch');
};