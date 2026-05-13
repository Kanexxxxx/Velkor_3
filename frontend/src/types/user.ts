export interface Address {
  id: string;
  label: string;
  recipient: string;
  street: string;
  complement?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  addresses: Address[];
}

export interface StoredUser extends User {
  passwordHash: string;
  passwordSalt: string;
  resetToken?: string;
  resetTokenExpiresAt?: string;
}

export interface AuthSession {
  user: User | null;
  isAuthenticated: boolean;
}
