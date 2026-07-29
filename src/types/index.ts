export interface StudentInput {
  number: number;
  name: string;
  gender: string;
}

export interface StudentData extends StudentInput {
  keywords?: string[];
  keywords2?: string[];
  comments?: string;
  comments2?: string;
  report?: string;
  report2?: string;
  completed?: boolean;
}

export interface AppConfig {
  passwordHash?: string;
  rememberKey?: boolean;
  encryptedKey?: string;
  lastClass?: string;
  adminPasswordHash?: string;
  users?: Record<string, string>;
}

export interface UserAccount {
  username: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
}
