'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AUTH_STORAGE_KEY,
  USERS_STORAGE_KEY,
  clearSession,
  consumeResetToken,
  createUser,
  deleteAddress,
  findUserByEmail,
  isStrongPassword,
  isValidEmail,
  normalizeEmail,
  publicUser,
  readSession,
  readUsers,
  setDefaultAddress,
  setResetToken,
  updateUserPassword,
  updateUserProfile,
  upsertAddress,
  verifyPassword,
  writeSession
} from '@/services/auth';
import type { Address, User } from '@/types/user';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isReady: boolean;
  register: (input: { name: string; email: string; password: string }) => Promise<User>;
  login: (input: { email: string; password: string }) => Promise<User>;
  logout: () => void;
  requestPasswordReset: (email: string) => { token: string; expiresAt: string };
  resetPassword: (input: { token: string; password: string }) => Promise<User>;
  updateProfile: (patch: Partial<Pick<User, 'name' | 'email' | 'phone'>>) => User;
  changePassword: (input: { currentPassword: string; nextPassword: string }) => Promise<void>;
  upsertAddress: (input: Omit<Address, 'id'> & { id?: string }) => User;
  removeAddress: (addressId: string) => User;
  makeAddressDefault: (addressId: string) => User;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadCurrentUser(): User | null {
  const session = readSession();
  if (!session) return null;
  const users = readUsers();
  const stored = users.find(item => item.id === session.userId);
  return stored ? publicUser(stored) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setUser(loadCurrentUser());
    setIsReady(true);
  }, []);

  useEffect(() => {
    function syncFromStorage(event: StorageEvent) {
      if (!event.key || event.key === AUTH_STORAGE_KEY || event.key === USERS_STORAGE_KEY) {
        setUser(loadCurrentUser());
      }
    }

    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  const refreshFromStorage = useCallback(() => {
    setUser(loadCurrentUser());
  }, []);

  const register = useCallback<AuthContextValue['register']>(async ({ name, email, password }) => {
    if (name.trim().length < 2) throw new Error('Informe seu nome para criar a conta.');
    if (!isValidEmail(email)) throw new Error('Email inválido.');
    if (!isStrongPassword(password)) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
    if (findUserByEmail(email)) throw new Error('Já existe uma conta com este email. Faça login.');

    const stored = await createUser({ name, email, password });
    writeSession(stored.id);
    const publicData = publicUser(stored);
    setUser(publicData);
    return publicData;
  }, []);

  const login = useCallback<AuthContextValue['login']>(async ({ email, password }) => {
    if (!isValidEmail(email)) throw new Error('Email inválido.');
    const stored = findUserByEmail(email);
    if (!stored) throw new Error('Conta não encontrada para este email.');
    const valid = await verifyPassword(password, stored.passwordSalt, stored.passwordHash);
    if (!valid) throw new Error('Senha incorreta.');
    writeSession(stored.id);
    const publicData = publicUser(stored);
    setUser(publicData);
    return publicData;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const requestPasswordReset = useCallback<AuthContextValue['requestPasswordReset']>(email => {
    if (!isValidEmail(email)) throw new Error('Informe um email válido.');
    const result = setResetToken(email);
    if (!result) throw new Error('Não encontramos esta conta.');
    return { token: result.token, expiresAt: result.user.resetTokenExpiresAt ?? '' };
  }, []);

  const resetPassword = useCallback<AuthContextValue['resetPassword']>(async ({ token, password }) => {
    if (!token) throw new Error('Token inválido.');
    if (!isStrongPassword(password)) throw new Error('A nova senha precisa ter pelo menos 6 caracteres.');
    const stored = consumeResetToken(token);
    if (!stored) throw new Error('Token inválido ou expirado.');
    const updated = await updateUserPassword(stored.id, password);
    if (!updated) throw new Error('Não foi possível atualizar a senha.');
    writeSession(updated.id);
    const publicData = publicUser(updated);
    setUser(publicData);
    return publicData;
  }, []);

  const updateProfile = useCallback<AuthContextValue['updateProfile']>(patch => {
    if (!user) throw new Error('Você precisa estar logado.');
    if (patch.email && !isValidEmail(patch.email)) throw new Error('Email inválido.');
    const updated = updateUserProfile(user.id, patch);
    if (!updated) throw new Error('Conta não encontrada.');
    if (patch.email && normalizeEmail(patch.email) !== user.email) {
      writeSession(updated.id);
    }
    const publicData = publicUser(updated);
    setUser(publicData);
    return publicData;
  }, [user]);

  const changePassword = useCallback<AuthContextValue['changePassword']>(async ({ currentPassword, nextPassword }) => {
    if (!user) throw new Error('Você precisa estar logado.');
    if (!isStrongPassword(nextPassword)) throw new Error('A nova senha precisa ter pelo menos 6 caracteres.');
    const stored = readUsers().find(item => item.id === user.id);
    if (!stored) throw new Error('Conta não encontrada.');
    const valid = await verifyPassword(currentPassword, stored.passwordSalt, stored.passwordHash);
    if (!valid) throw new Error('Senha atual incorreta.');
    const updated = await updateUserPassword(stored.id, nextPassword);
    if (!updated) throw new Error('Não foi possível atualizar a senha.');
    refreshFromStorage();
  }, [refreshFromStorage, user]);

  const upsertAddressFor = useCallback<AuthContextValue['upsertAddress']>(input => {
    if (!user) throw new Error('Você precisa estar logado.');
    const updated = upsertAddress(user.id, input);
    if (!updated) throw new Error('Conta não encontrada.');
    const publicData = publicUser(updated);
    setUser(publicData);
    return publicData;
  }, [user]);

  const removeAddress = useCallback<AuthContextValue['removeAddress']>(addressId => {
    if (!user) throw new Error('Você precisa estar logado.');
    const updated = deleteAddress(user.id, addressId);
    if (!updated) throw new Error('Conta não encontrada.');
    const publicData = publicUser(updated);
    setUser(publicData);
    return publicData;
  }, [user]);

  const makeAddressDefault = useCallback<AuthContextValue['makeAddressDefault']>(addressId => {
    if (!user) throw new Error('Você precisa estar logado.');
    const updated = setDefaultAddress(user.id, addressId);
    if (!updated) throw new Error('Conta não encontrada.');
    const publicData = publicUser(updated);
    setUser(publicData);
    return publicData;
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isReady,
      register,
      login,
      logout,
      requestPasswordReset,
      resetPassword,
      updateProfile,
      changePassword,
      upsertAddress: upsertAddressFor,
      removeAddress,
      makeAddressDefault
    }),
    [changePassword, isReady, login, logout, makeAddressDefault, register, removeAddress, requestPasswordReset, resetPassword, updateProfile, upsertAddressFor, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa estar dentro de AuthProvider');
  }

  return context;
}
