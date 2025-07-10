/**
 * @returns {string} A randomly generated email address ending with '@fake.email'
 */
export const generateEmail = (): string => {
  let email = '';
  for (var k = 0; k < 2; k++) {
    var chars = 'abcdefghijklmnopqrstuvwxyz1234567890';
    var string = '';
    for (var ii = 0; ii < 15; ii++) {
      string += chars[Math.floor(Math.random() * chars.length)];
    }
    email = string + '@portpro.io';
  }
  return email;
};

/**
 * Generate multiple fake email addresses
 * @param {number} count - Number of email addresses to generate
 * @returns {string[]} Array of randomly generated email addresses
 */
export const generateEmails = (count: number): string[] => {
  const emails: string[] = [];
  for (let i = 0; i < count; i++) {
    emails.push(generateEmail());
  }
  return emails;
};

/**
 * Check if an email address is empty or invalid
 * @param {string | null | undefined} email - Email address to validate
 * @returns {boolean} True if email is empty, null, undefined, or only whitespace
 */
export const isEmailEmpty = (email: string | null | undefined): boolean => {
  return !email || (typeof email === 'string' && email.trim() === '');
}; 