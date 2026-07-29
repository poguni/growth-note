import { hashPassword } from './webCrypto';
import { loadConfig, saveConfig, listClasses, deleteClassData } from './webStorage';

const ADMIN_ID = 'admin';

export function hasAdminPasswordSet(): boolean {
  const config = loadConfig();
  return !!(config && config.adminPasswordHash);
}

export async function setupAdminPassword(password: string): Promise<boolean> {
  try {
    const config = loadConfig() || {};
    const adminPasswordHash = await hashPassword(password);
    saveConfig({
      ...config,
      adminPasswordHash,
    });
    return true;
  } catch (err) {
    console.error('Failed to setup admin password:', err);
    return false;
  }
}

export async function login({ username, password }: { username: string; password: string }) {
  if (username === ADMIN_ID) {
    const config = loadConfig();
    if (!config || !config.adminPasswordHash) {
      return { success: false, needSetup: true, error: '관리자 비밀번호가 아직 설정되지 않았습니다.' };
    }

    const inputHash = await hashPassword(password);
    if (inputHash === config.adminPasswordHash) {
      return { success: true, isAdmin: true };
    }
    return { success: false, error: '관리자 비밀번호가 일치하지 않습니다.' };
  }

  const config = loadConfig();
  const users = config?.users || {};

  // Backward compatibility check
  if (Object.keys(users).length === 0 && config?.passwordHash && (username === '교사' || username === '선생님')) {
    const inputHash = await hashPassword(password);
    if (inputHash === config.passwordHash) {
      users[username] = config.passwordHash;
      saveConfig({ ...config, users });
      return { success: true, isAdmin: false };
    }
  }

  const userHash = users[username];
  if (!userHash) {
    return { success: false, error: '존재하지 않는 사용자 아이디입니다.' };
  }

  const inputHash = await hashPassword(password);
  if (inputHash === userHash) {
    return { success: true, isAdmin: false };
  }

  return { success: false, error: '비밀번호가 일치하지 않습니다.' };
}

export async function register({ username, password }: { username: string; password: string }) {
  if (username.toLowerCase() === ADMIN_ID) {
    return { success: false, error: 'admin 아이디는 사용할 수 없습니다.' };
  }

  const config = loadConfig() || {};
  const users = config.users || {};

  if (users[username]) {
    return { success: false, error: '이미 존재하는 아이디입니다.' };
  }

  const passwordHash = await hashPassword(password);
  users[username] = passwordHash;

  const newConfig = {
    ...config,
    users,
    passwordHash: config.passwordHash || passwordHash,
  };

  saveConfig(newConfig);
  return { success: true };
}

export async function resetUserPassword({ username }: { username: string }) {
  const config = loadConfig();
  if (config && config.users && config.users[username]) {
    const defaultPasswordHash = await hashPassword('assess1234');
    config.users[username] = defaultPasswordHash;
    saveConfig(config);
    return true;
  }
  return false;
}

export async function deleteUser({ username }: { username: string }) {
  const config = loadConfig() || {};
  if (config.users && config.users[username]) {
    delete config.users[username];
  }

  if (username === '교사' || username === '선생님') {
    delete config.passwordHash;
  }

  saveConfig(config);

  const userClasses = listClasses(username);
  userClasses.forEach(className => {
    deleteClassData(username, className);
  });

  return true;
}

export function adminListAllData() {
  const config = loadConfig();
  const users = config?.users ? Object.keys(config.users) : [];
  if (users.length === 0 && config?.passwordHash) {
    users.push('선생님');
  }

  const classes: { username: string; className: string }[] = [];
  users.forEach(u => {
    const userClasses = listClasses(u);
    userClasses.forEach(className => {
      classes.push({ username: u, className });
    });
  });

  return { users, classes };
}
