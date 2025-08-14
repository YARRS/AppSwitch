// Phone validation utility functions for consistent phone handling across the app
// These functions mirror the backend AuthService.format_phone_number logic

/**
 * Format and validate phone number - supports multiple international formats
 * @param {string} phoneInput - The phone input to format
 * @returns {string} - Formatted phone number
 * @throws {Error} - If phone format is invalid
 */
export function formatPhoneNumber(phoneInput) {
  if (!phoneInput) {
    throw new Error("Phone number is required");
  }

  const originalPhone = phoneInput.trim();
  
  // Remove all non-digit characters for processing
  const phone = originalPhone.replace(/\D/g, '');
  
  // Handle different input formats based on original input and length
  
  // US phone number with +1 prefix: +1234567890 (11 chars original, 10 digits cleaned)
  if (originalPhone.startsWith('+1') && phone.length === 10) {
    return originalPhone; // Keep +1234567890 format
  }
  
  // US phone number with 1 prefix: 12345678901 (11 digits cleaned)
  else if (phone.length === 11 && phone.startsWith('1') && !originalPhone.startsWith('+')) {
    return phone; // Keep 12345678901 format
  }
  
  // Indian phone number with +91 prefix
  else if (originalPhone.startsWith('+91')) {
    if (phone.length === 12 && phone.startsWith('91')) {
      // +919876543210 -> 9876543210
      return phone.substring(2);
    } else if (phone.length === 11) {
      // +91987654321 -> 987654321 (only 9 digits, invalid)
      throw new Error(`Invalid Indian phone format. Expected +91 followed by 10 digits, got ${phone.length - 2} digits after +91`);
    } else if (phone.length === 10) {
      // +91987654321 where input was malformed, but we got 10 digits somehow
      return phone;
    } else {
      throw new Error(`Invalid Indian phone format with +91 prefix. Expected 12 total digits, got ${phone.length}`);
    }
  }
  
  // Indian phone number with 91 prefix: 919876543210 (12 digits cleaned)
  else if (phone.length === 12 && phone.startsWith('91') && !originalPhone.startsWith('+')) {
    return phone.substring(2); // Return 9876543210
  }
  
  // Indian phone number with 0 prefix: 09876543210 (11 digits cleaned)
  else if (phone.length === 11 && phone.startsWith('0')) {
    return phone.substring(1); // Return 9876543210
  }
  
  // 10-digit number (could be Indian mobile or US without country code)
  else if (phone.length === 10) {
    return phone; // Return as-is
  }
  
  else {
    throw new Error(`Invalid phone number format. Input: '${originalPhone}', Cleaned: '${phone}' (${phone.length} digits)`);
  }
}

/**
 * Check if input string is an email address
 * @param {string} inputStr - The input to check
 * @returns {boolean} - True if email, false otherwise
 */
export function isEmail(inputStr) {
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailPattern.test(inputStr.trim());
}

/**
 * Check if input string looks like a phone number
 * @param {string} inputStr - The input to check
 * @returns {boolean} - True if phone-like, false otherwise
 */
export function isPhoneNumber(inputStr) {
  // Check if it contains mostly digits and phone-like patterns
  const phoneClean = inputStr.trim().replace(/\D/g, '');
  
  // Must have between 10-13 digits (accounting for country codes)
  if (phoneClean.length < 10 || phoneClean.length > 13) {
    return false;
  }
  
  // Check for common phone number patterns (expanded for international support)
  const phonePatterns = [
    /^[0-9]{10}$/,        // 9876543210 (10 digits)
    /^0[0-9]{10}$/,       // 09876543210 (11 digits with leading 0)
    /^91[0-9]{10}$/,      // 919876543210 (Indian with country code)
    /^\+91[0-9]{10}$/,    // +919876543210 (Indian with +)
    /^1[0-9]{10}$/,       // 12345678901 (US with country code)
    /^\+1[0-9]{10}$/,     // +12345678901 (US with +)
    /^\+[0-9]{10,12}$/,   // Generic international format
  ];
  
  for (const pattern of phonePatterns) {
    if (pattern.test(inputStr.trim())) {
      return true;
    }
  }
  
  // Additional check: if it's mostly numbers and reasonable length
  if (phoneClean.length >= 10 && phoneClean.length <= 13) {
    // Check if at least 70% of characters are digits in original string
    const totalChars = inputStr.trim().length;
    const digitRatio = totalChars > 0 ? phoneClean.length / totalChars : 0;
    if (digitRatio >= 0.7) {
      return true;
    }
  }
  
  return false;
}

/**
 * Validate phone number for forms
 * @param {string} phone - Phone number to validate
 * @returns {object} - Validation result with isValid and error properties
 */
export function validatePhoneNumber(phone) {
  if (!phone || !phone.trim()) {
    return { isValid: false, error: 'Phone number is required' };
  }

  try {
    const formatted = formatPhoneNumber(phone);
    
    // Additional validation - ensure it's at least 10 digits
    const digits = formatted.replace(/\D/g, '');
    if (digits.length < 10) {
      return { isValid: false, error: 'Phone number must have at least 10 digits' };
    }
    
    return { isValid: true, formatted, error: null };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}

/**
 * Format phone number for display (add visual separators)
 * @param {string} phone - Phone number to format for display
 * @returns {string} - Display formatted phone number
 */
export function formatPhoneForDisplay(phone) {
  if (!phone) return phone;
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format based on length
  if (digits.length === 10) {
    // Format as (XXX) XXX-XXXX
    return `(${digits.substr(0, 3)}) ${digits.substr(3, 3)}-${digits.substr(6, 4)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // US format with country code: +1 (XXX) XXX-XXXX
    return `+1 (${digits.substr(1, 3)}) ${digits.substr(4, 3)}-${digits.substr(7, 4)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    // Indian format with country code: +91 XXXXX-XXXXX
    const mobile = digits.substr(2);
    return `+91 ${mobile.substr(0, 5)}-${mobile.substr(5, 5)}`;
  }
  
  // Return as-is if we can't format it nicely
  return phone;
}