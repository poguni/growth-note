import type { AppConfig, StudentData } from '../types';

const CONFIG_KEY = 'behavior_report_config';
const CLASS_PREFIX = 'behavior_report_class_';
const CLASSES_LIST_PREFIX = 'behavior_report_classes_list_';

export function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save config to localStorage', err);
  }
}

export function loadConfig(): AppConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to load config from localStorage', err);
    return null;
  }
}

export function saveClassData(username: string, className: string, data: StudentData[]): void {
  try {
    const storageKey = `${CLASS_PREFIX}${username}_${className}`;
    localStorage.setItem(storageKey, JSON.stringify(data));

    // Update teacher's class index list
    const classes = listClasses(username);
    if (!classes.includes(className)) {
      classes.push(className);
      localStorage.setItem(`${CLASSES_LIST_PREFIX}${username}`, JSON.stringify(classes));
    }
  } catch (err) {
    console.error('Failed to save class data', err);
  }
}

export function loadClassData(username: string, className: string): StudentData[] | null {
  try {
    const storageKey = `${CLASS_PREFIX}${username}_${className}`;
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to load class data', err);
    return null;
  }
}

export function deleteClassData(username: string, className: string): void {
  try {
    const storageKey = `${CLASS_PREFIX}${username}_${className}`;
    localStorage.removeItem(storageKey);

    const classes = listClasses(username).filter(c => c !== className);
    localStorage.setItem(`${CLASSES_LIST_PREFIX}${username}`, JSON.stringify(classes));
  } catch (err) {
    console.error('Failed to delete class data', err);
  }
}

export function listClasses(username: string): string[] {
  try {
    const raw = localStorage.getItem(`${CLASSES_LIST_PREFIX}${username}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to list classes', err);
    return [];
  }
}

export function saveClassJson(className: string, data: StudentData[]): boolean {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    const koreaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const yyyy = koreaDate.getFullYear();
    const mm = String(koreaDate.getMonth() + 1).padStart(2, '0');
    const dd = String(koreaDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;
    const fileName = `${className}_행동특성_종합의견_${dateStr}.json`;

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to save class JSON', err);
    return false;
  }
}

export function loadClassJsonFromFile(file: File): Promise<StudentData[] | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          resolve(parsed);
        } else {
          alert('올바른 JSON 학생 데이터 형식이 아닙니다.');
          resolve(null);
        }
      } catch (err) {
        alert('JSON 파일을 읽는 중 오류가 발생했습니다.');
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
