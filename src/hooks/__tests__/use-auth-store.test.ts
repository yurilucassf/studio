
import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from '../use-auth-store';
import type { User } from '@/lib/types';
import type { UserMetadata, UserInfo } from 'firebase/auth';

// Mock User para testes
const mockUserMetadata: UserMetadata = {
  creationTime: new Date().toISOString(),
  lastSignInTime: new Date().toISOString(),
};
const mockProviderData: UserInfo[] = [];

const mockUser: User = {
  uid: 'test-uid',
  email: 'test@example.com',
  name: 'Test User',
  role: 'employee',
  emailVerified: true,
  isAnonymous: false,
  metadata: mockUserMetadata,
  providerData: mockProviderData,
  delete: jest.fn(() => Promise.resolve()),
  getIdToken: jest.fn(() => Promise.resolve('mock-id-token')),
  getIdTokenResult: jest.fn(() => Promise.resolve({ token: 'mock-id-token' } as any)),
  reload: jest.fn(() => Promise.resolve()),
  toJSON: jest.fn(() => ({})),
  displayName: 'Test User',
  photoURL: null,
  phoneNumber: null,
  providerId: 'password',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reseta o estado do store antes de cada teste
    act(() => {
      useAuthStore.setState({ user: null, isLoading: true });
    });
  });

  it('deve ter o estado inicial correto', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('setUser deve atualizar o usuário e isLoading para false', () => {
    const { result } = renderHook(() => useAuthStore());
    
    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
  });

  it('setUser deve definir o usuário como null e isLoading para false', () => {
    const { result } = renderHook(() => useAuthStore());
     act(() => { // Primeiro define um usuário
      result.current.setUser(mockUser);
    });
    
    act(() => {
      result.current.setUser(null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('setLoading deve atualizar isLoading', () => {
    const { result } = renderHook(() => useAuthStore());
    
    act(() => {
      result.current.setLoading(false);
    });
    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.setLoading(true);
    });
    expect(result.current.isLoading).toBe(true);
  });
});
