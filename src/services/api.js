// Set these in your .env file (see .env.example):
//   EXPO_PUBLIC_API_URL  server address WITH /api at the end, for example https://myserver/api
//   EXPO_PUBLIC_BRANCH   branch name used to sync the accounts
// When EXPO_PUBLIC_API_URL is empty, uploads run in DEMO MODE (they pretend to work).
// Login and account sync always need the real server.
const API_URL = process.env.EXPO_PUBLIC_API_URL;
export const BRANCH = process.env.EXPO_PUBLIC_BRANCH || '';

// If your server needs more headers (for example an API key), add them here
// and read the value from .env. Do not write secrets in the code.
const JSON_HEADERS = { 'Content-Type': 'application/json' };


function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// fetch that gives up after a few seconds, so the app does not hang with a bad signal
async function fetchWithTimeout(resource, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/login/mobile
// Returns the user data. Throws Error('INVALID') for a wrong username/password,
// Error('NETWORK') when the server cannot be reached, Error('SERVER') for other errors.
export async function loginOnline(username, password) {
  if (!API_URL) throw new Error('NO_API_URL');

  let response;
  try {
    response = await fetchWithTimeout(`${API_URL}/login`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ Username: username, Pass: password }),
    });
  } catch (error) {
    throw new Error('NETWORK');
  }

  if (response.status === 404 || response.status === 400 || response.status === 401) {
    throw new Error('INVALID');
  }
  if (!response.ok) throw new Error('SERVER');
  return await response.json();
}

// GET /api/user?branch=...  (all accounts of the branch, with encrypted passwords)
export async function getUsers(branch) {
  if (!API_URL) throw new Error('NO_API_URL');
  if (!branch) throw new Error('NO_BRANCH');

  const response = await fetchWithTimeout(
    `${API_URL}/user?branch=${encodeURIComponent(branch)}`,
    { headers: JSON_HEADERS },
    20000
  );
  if (!response.ok) throw new Error('Failed to sync accounts');
  return await response.json();
}

// Sends one saved record (checklist or urgent repair) and its photo to the server
export async function uploadRecord(record) {
  if (!API_URL) {
    await wait(500);
    return;
  }

  const { photoUri, ...recordData } = record;

  const formData = new FormData();
  formData.append('data', JSON.stringify(recordData));
  if (photoUri) {
    formData.append('photo', { uri: photoUri, name: `${record.id}.jpg`, type: 'image/jpeg' });
  }

  const response = await fetch(`${API_URL}/roving-records`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload record');
  }
}
