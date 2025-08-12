import React from 'react';
import axios from 'axios';

// Cache for decrypted phone numbers to avoid repeated API calls
const phoneCache = new Map();

/**
 * Decrypt and format a phone number for display
 * @param {string} encryptedPhone - The encrypted phone number
 * @param {function} getAuthenticatedAxios - Function to get authenticated axios instance
 * @returns {Promise<string>} - The decrypted and formatted phone number
 */
export const decryptPhoneNumber = async (encryptedPhone, getAuthenticatedAxios) => {
  try {
    // Handle empty or null values
    if (!encryptedPhone || encryptedPhone.trim() === '' || encryptedPhone.includes('@placeholder.com')) {
      return 'Not provided';
    }

    // Check cache first
    if (phoneCache.has(encryptedPhone)) {
      return phoneCache.get(encryptedPhone);
    }

    // If it looks like a regular unencrypted phone number, format it directly
    const cleanPhone = encryptedPhone.replace(/\D/g, '');
    if (cleanPhone.length === 10 && /^\d{10}$/.test(cleanPhone)) {
      const formatted = `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
      phoneCache.set(encryptedPhone, formatted);
      return formatted;
    }

    // Try to decrypt via API
    const axiosInstance = getAuthenticatedAxios();
    const response = await axiosInstance.post('/api/auth/decrypt-phone', {
      encrypted_data: encryptedPhone
    });

    if (response.data.success) {
      const decryptedPhone = response.data.data.decrypted_data;
      phoneCache.set(encryptedPhone, decryptedPhone);
      return decryptedPhone;
    } else {
      // Fallback to showing the encrypted data
      return encryptedPhone;
    }
  } catch (error) {
    console.error('Failed to decrypt phone number:', error);
    
    // Try basic formatting as fallback
    const cleanPhone = encryptedPhone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      const formatted = `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
      return formatted;
    }
    
    // Return original if all else fails
    return encryptedPhone;
  }
};

/**
 * Decrypt multiple phone numbers in batch
 * @param {Array<string>} encryptedPhones - Array of encrypted phone numbers
 * @param {function} getAuthenticatedAxios - Function to get authenticated axios instance
 * @returns {Promise<Array<string>>} - Array of decrypted phone numbers
 */
export const decryptPhoneNumbers = async (encryptedPhones, getAuthenticatedAxios) => {
  try {
    const decryptPromises = encryptedPhones.map(phone => 
      decryptPhoneNumber(phone, getAuthenticatedAxios)
    );
    return await Promise.all(decryptPromises);
  } catch (error) {
    console.error('Failed to decrypt phone numbers in batch:', error);
    return encryptedPhones; // Return original array as fallback
  }
};

/**
 * Clear the phone cache (useful when user logs out)
 */
export const clearPhoneCache = () => {
  phoneCache.clear();
};

/**
 * React hook for decrypting phone numbers
 * @param {string} encryptedPhone - The encrypted phone number
 * @param {function} getAuthenticatedAxios - Function to get authenticated axios instance
 * @returns {Object} - { decryptedPhone, loading, error }
 */
export const useDecryptPhone = (encryptedPhone, getAuthenticatedAxios) => {
  const [decryptedPhone, setDecryptedPhone] = React.useState('Loading...');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!encryptedPhone || !getAuthenticatedAxios) {
      setDecryptedPhone('Not provided');
      setLoading(false);
      return;
    }

    const decrypt = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await decryptPhoneNumber(encryptedPhone, getAuthenticatedAxios);
        setDecryptedPhone(result);
      } catch (err) {
        setError(err);
        setDecryptedPhone(encryptedPhone); // Fallback to original
      } finally {
        setLoading(false);
      }
    };

    decrypt();
  }, [encryptedPhone, getAuthenticatedAxios]);

  return { decryptedPhone, loading, error };
};