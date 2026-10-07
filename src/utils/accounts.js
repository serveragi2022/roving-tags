import { loadJson, saveJson } from './storage';
import { encryptPassword } from './encryption';

// Access names (from the "accessmodule" of the account in MMS)
export const ACCESS_APP = 'Roving Tags Cleaning and Monitoring'; // needed to log in
export const ACCESS_SETUP = 'Roving Tags Cleaning and Monitoring - Routes/Checklist'; // needed to set routes and checklists
export const ACCESS_APPROVE = 'Roving Tags Cleaning and Monitoring - Approve'; // needed to approve urgent repairs

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
    accessModule: data.access_module ?? data.accessmodule ?? data.accessModule ?? data.AccessModule,
    accessDept: data.access_dept || data.access_department,
    username,
    apiKey: data.api_key ?? data.apiKey, // only in the login answer, not kept in the user
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
    accessmodule: item.accessmodule ?? item.access_module ?? item.accessModule,
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
    (item) => String(item.username).toLowerCase() === name && item.pass === encryptPassword(password) && item.status === 'Active'
  );

  if (!account || account.pass !== encryptPassword(password)) throw new Error('INVALID');
  return account;
}

// Can approve urgent repairs (works with a saved account)
export function canApprove(account) {
  return hasAccess(account, ACCESS_APPROVE);
}

// Turns the access value of an account into a list of lowercase names.
// Works with an array, a JSON array text, or a list separated by , ; | or new lines.
// (The names themselves contain " - " and "/", so those are not used to split.)
function accessNames(value) {
  if (value === undefined || value === null) return [];
  let items = value;
  if (typeof items === 'string') {
    const text = items.trim();
    if (text.startsWith('[')) {
      try {
        items = JSON.parse(text);
      } catch (error) {
        items = text.split(/[,;|\n]/);
      }
    } else {
      items = text.split(/[,;|\n]/);
    }
  }
  if (!Array.isArray(items)) return [];
  return items.map((item) => String(item).trim().replace(/\s+/g, ' ').toLowerCase()).filter(Boolean);
}

// true when the user (or saved account) has this exact access name
function hasAccess(userOrAccount, accessName) {
  if (!userOrAccount) return false;
  const value = userOrAccount.accessModule ?? userOrAccount.accessmodule;
  return accessNames(value).includes(accessName.toLowerCase());
}

// Can log in to the Roving Tags app
export function canUseApp(userOrAccount) {
  return hasAccess(userOrAccount, ACCESS_APP);
}

// Can set the roving route and the checklists
export function canSetup(user) {
  return hasAccess(user, ACCESS_SETUP);
}

// Short message for the user
export function describeLoginError(error) {
  if (error.message === 'NO_ACCOUNTS') {
    return 'No accounts on this phone yet. Connect to the internet and sync accounts first.';
  }
  if (error.message === 'INVALID') return 'Username / Password incorrect.';
  if (error.message === 'NO_ACCESS') {
    return `Your account has no access to "${ACCESS_APP}". Please ask the administrator.`;
  }
  if (error.message === 'NO_API_URL') return 'Server address is not set. Check EXPO_PUBLIC_API_URL in .env.';
  if (error.message === 'NO_BRANCH') return 'Branch is not set. Check EXPO_PUBLIC_BRANCH in .env.';
  return error.message;
}
