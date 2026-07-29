/**
 * Web Crypto API implementation for Web_version
 * Provides password hashing (SHA-256) and AES key encryption/decryption using Web Crypto API.
 */

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getDerivedKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const secretBuffer = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', secretBuffer);
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptKey(text: string, secret: string): Promise<string> {
  try {
    const key = await getDerivedKey(secret);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(text);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedText
    );

    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const ciphertextHex = Array.from(new Uint8Array(ciphertextBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return `${ivHex}:${ciphertextHex}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('Encryption failed');
  }
}

export async function decryptKey(encryptedText: string, secret: string): Promise<string> {
  try {
    const parts = encryptedText.split(':');
    if (parts.length < 2) {
      throw new Error('Invalid cipher format');
    }
    const ivHex = parts[0];
    const ciphertextHex = parts[1];

    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(ciphertextHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const key = await getDerivedKey(secret);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Decryption failed. Invalid secret or corrupted data.');
  }
}
