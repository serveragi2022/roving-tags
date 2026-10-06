import { loadJson, saveJson } from './storage';
import { encryptPassword } from './encryption';

// Only this position can approve urgent repairs
export const APPROVER_POSITION = 'Shift Miller';

// Makes the logged-in user object from the API login result or from a synced account
export function makeUser(data, username) {
  return {
    userId: data.user_id,
    employeeId: String(data.emp_id || data.user_id),
    name: data.name,
    firstname: data.firstname,
    lastname: data.lastname,
    role: data.position || '',
    department: data.department,
    branch: data.branch,
    accessModule: data.access_module || data.accessmodule,
    accessDept: data.access_dept || data.access_department,
    username,
  };
}

// Saves the accounts from GET /api/user on the phone (for offline login and approval).
// The password stays encrypted exactly as the server sends it.
export async function saveAccounts(apiUsers) {
  const accounts = apiUsers.map((item) => ({
    user_id: item.user_id,
    name: item.name,
    firstname: item.firstname,
    lastname: item.lastname,
    position: item.position,
    department: item.department,
    access_department: item.access_department,
    username: item.username,
    pass: item.pass,
    status: item.status,
    branch: item.branch,
    accessmodule: item.accessmodule,
    emp_id: item.emp_id,
  }));
  await saveJson('roving_accounts', accounts);
  await saveJson('roving_accounts_synced_at', new Date().toISOString());
  return accounts.length;
}

export async function loadAccountInfo() {
  const accounts = await loadJson('roving_accounts', []);
  const syncedAt = await loadJson('roving_accounts_synced_at', null);
  return { count: accounts.length, syncedAt };
}

// Checks username + password against the accounts saved on the phone.
// Returns the account or throws Error('NO_ACCOUNTS') / Error('INVALID').
export async function findAccount(username, password) {
  const accounts = await loadJson('roving_accounts', []);
  if (accounts.length === 0) throw new Error('NO_ACCOUNTS');

  const name = username.trim().toLowerCase();
  const account = accounts.find(
    (item) => String(item.username).toLowerCase() === name && item.status === 'Active'
  );
  if (!account || account.pass !== encryptPassword(password)) throw new Error('INVALID');
  return account;
}

export function isShiftMiller(account) {
  return String(account.position || '').trim().toLowerCase() === APPROVER_POSITION.toLowerCase();
}

// Short message for the user
export function describeLoginError(error) {
  if (error.message === 'NO_ACCOUNTS') {
    return 'No accounts on this phone yet. Connect to the internet and sync accounts first.';
  }
  if (error.message === 'INVALID') return 'Username / Password incorrect.';
  if (error.message === 'NO_API_URL') return 'Server address is not set. Check EXPO_PUBLIC_API_URL in .env.';
  if (error.message === 'NO_BRANCH') return 'Branch is not set. Check EXPO_PUBLIC_BRANCH in .env.';
  return error.message;
}
