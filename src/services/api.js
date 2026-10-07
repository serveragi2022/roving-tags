
import { File } from 'expo-file-system';
// Set these in your .env file (see .env.example):
//   EXPO_PUBLIC_API_URL  server address WITH /api at the end, for example https://myserver/api
//   EXPO_PUBLIC_BRANCH   branch name used to sync the accounts
// When EXPO_PUBLIC_API_URL is empty, uploads run in DEMO MODE (they pretend to work).
// Login and account sync always need the real server.
const API_URL = process.env.EXPO_PUBLIC_API_URL;
export const BRANCH = process.env.EXPO_PUBLIC_BRANCH || "";

// If your server needs more headers (for example an API key), add them here
// and read the value from .env. Do not write secrets in the code.
const JSON_HEADERS = { "Content-Type": "application/json" };

// The api_key from the login answer. It is sent like the desktop app does:
//   Authorization: Basic <api_key>
let apiKey = "";

export function setApiKey(key) {
  apiKey = key || "";
}

function authHeaders() {
  return apiKey ? { Authorization: `Basic ${apiKey}` } : {};
}

function jsonHeaders() {
  return { ...JSON_HEADERS, ...authHeaders() };
}

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
  if (!API_URL) throw new Error("NO_API_URL");

  let response;
  try {
    response = await fetchWithTimeout(`${API_URL}/login`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ Username: username, Pass: password }),
    });
  } catch (error) {
    throw new Error("NETWORK");
  }

  if (
    response.status === 404 ||
    response.status === 400 ||
    response.status === 401
  ) {
    throw new Error("INVALID");
  }
  if (!response.ok) throw new Error("SERVER");
  return await response.json();
}

// GET /api/user?branch=...  (all accounts of the branch, with encrypted passwords)
export async function getUsers(branch) {
  if (!API_URL) throw new Error("NO_API_URL");
  if (!branch) throw new Error("NO_BRANCH");

  const response = await fetchWithTimeout(
    `${API_URL}/user?branch=${encodeURIComponent(branch)}`,
    { headers: jsonHeaders() },
    20000,
  );
  if (!response.ok) throw new Error("Failed to sync accounts");
  return await response.json();
}

// ---------- Route and checklist setup (set by users with the Routes/Checklist access, read by everyone) ----------

// The server answer is read in camelCase, PascalCase or snake_case
function pick(data, name) {
  if (!data) return undefined;
  const pascal = name.charAt(0).toUpperCase() + name.slice(1);
  const snake = name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  for (const key of [name, pascal, snake]) {
    if (data[key] !== undefined) return data[key];
  }
  return undefined;
}

async function sendSetup(path, body) {
  const response = await fetchWithTimeout(
    `${API_URL}${path}`,
    { method: "PUT", headers: jsonHeaders(), body: JSON.stringify(body) },
    10000,
  );
  console.log("sendSetup", path, response.status);
  if (response.status === 403) throw new Error("FORBIDDEN"); // server says: no setup access
  if (!response.ok) throw new Error("Failed to save setup");
}

// GET /api/roving-routes?branch=&workDate=&mill=&shift=
// Returns { machineCodes } or null when no route was set. Throws when the server cannot be reached.
export async function getRouteRemote(branch, { workDate, mill, shift }) {
  if (!API_URL) throw new Error("NO_API_URL");
  const query =
    `branch=${encodeURIComponent(branch)}&workDate=${encodeURIComponent(workDate)}` +
    `&mill=${encodeURIComponent(mill)}&shift=${encodeURIComponent(shift)}`;
  const response = await fetchWithTimeout(
    `${API_URL}/roving-routes?${query}`,
    { headers: jsonHeaders() },
    6000,
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Failed to load route");
  const data = await response.json();
  return { machineCodes: pick(data, "machineCodes") || [] };
}

// PUT /api/roving-routes  (needs the Routes/Checklist access, the server checks it for userId)
export async function saveRouteRemote({
  branch,
  workDate,
  mill,
  shift,
  machineCodes,
  userId,
}) {
  if (!API_URL) throw new Error("NO_API_URL");
  // Keys are written exactly like the C# SaveRouteRequest properties
  await sendSetup("/roving-routes", {
    Branch: branch,
    WorkDate: workDate,
    Mill: mill,
    Shift: shift,
    MachineCodes: machineCodes,
    UserId: String(userId),
  });
}

// GET /api/roving-config?branch=   ->  { checklists, checklistMap } or null when never saved
export async function getConfigRemote(branch) {
  if (!API_URL) throw new Error("NO_API_URL");
  const response = await fetchWithTimeout(
    `${API_URL}/roving-config?branch=${encodeURIComponent(branch)}`,
    { headers: jsonHeaders() },
    8000,
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Failed to load checklists");
  const data = await response.json();
  return {
    checklists: pick(data, "checklists") || [],
    checklistMap: pick(data, "checklistMap") || {},
  };
}

// PUT /api/roving-config  (needs the Routes/Checklist access)
export async function saveConfigRemote({
  branch,
  checklists,
  checklistMap,
  userId,
}) {
  if (!API_URL) throw new Error("NO_API_URL");
  // Keys are written exactly like the C# SaveConfigRequest properties
  await sendSetup("/roving-config", {
    Branch: branch,
    Checklists: checklists,
    ChecklistMap: checklistMap,
    UserId: String(userId),
  });
}

// Sends one saved record (checklist or urgent repair) and its photo to the server
// "fallback" ({ branch, userId }) is used for records made before the phone saved them in the record
export async function uploadRecord(record, fallback = {}) {
  if (!API_URL) {
    await wait(500);
    return;
  }

  const { photoUri, ...recordData } = record;

  if (!recordData.branch) {
    recordData.branch = fallback.branch;
  }

  if (!recordData.userId) {
    recordData.userId = fallback.userId;
  }

  const formData = new FormData();

  formData.append("data", JSON.stringify(recordData));

  if (photoUri) {
    console.log("PHOTO URI:", photoUri);

    const file = new File(photoUri);

    console.log("FILE:", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    });

    formData.append("photo", file);
  }

  console.log("SENDING REQUEST...");

  const response = await fetch(`${API_URL}/roving-records`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  const responseText = await response.text();

  console.log("UPLOAD RESPONSE:", {
    status: response.status,
    ok: response.ok,
    content: responseText,
  });

  if (!response.ok) {
    throw new Error(
      responseText || `Upload failed with status ${response.status}`
    );
  }

  return responseText;
}