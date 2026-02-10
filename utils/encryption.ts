// Simple simulation of AES-like encryption for the demo.
// In a production environment, use window.crypto.subtle.

const SECRET_KEY = "SPJIMR_SPARSH_SECRET";

export const encryptData = (text: string): string => {
  try {
    // Simulate encryption by encoding to Base64 and shifting
    const encoded = btoa(encodeURIComponent(text));
    return `ENC_${encoded.split('').reverse().join('')}`;
  } catch (e) {
    console.error("Encryption failed", e);
    return text;
  }
};

export const decryptData = (cipherText: string): string => {
  try {
    if (!cipherText.startsWith('ENC_')) return cipherText;
    const reversed = cipherText.replace('ENC_', '').split('').reverse().join('');
    return decodeURIComponent(atob(reversed));
  } catch (e) {
    console.error("Decryption failed", e);
    return "Error: Could not decrypt message.";
  }
};