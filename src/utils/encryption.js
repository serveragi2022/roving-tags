import CryptoJS from "crypto-js";

// Mirrors C# GetHashKey: PBKDF2(password=hashKey, salt="JennelMarasigan", 16 bytes, default iterations=1000, SHA1)
function getHashKey(hashKey) {
  const salt = CryptoJS.enc.Utf8.parse("JennelMarasigan");
  const key = CryptoJS.PBKDF2(hashKey, salt, {
    keySize: 128 / 32, // 16 bytes
    iterations: 1000,
    hasher: CryptoJS.algo.SHA1,
  });
  return key; // WordArray, 16 bytes
}

// Mirrors C# Encrypt: AES, Key=IV=key, default mode CBC, default padding PKCS7
export function encryptPassword(plainPassword) {
  const key = getHashKey("@JennelMarasigan");
  const iv = key; // same bytes used as IV
  const encrypted = CryptoJS.AES.encrypt(plainPassword, key, { iv });
  return encrypted.toString(); // Base64 string, matches C# output
}