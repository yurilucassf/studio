
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppSidebar } from '../app-sidebar';
import { useAuthStore } from '@/hooks/use-auth-store';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import type { UserMetadata, UserInfo } from 'firebase/auth';

// Mock das dependências
jest.mock('@/hooks/use-auth-store');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));
jest.mock('firebase/auth', () => ({
  ...jest.requireActual('firebase/auth'), // Importa o módulo real para não quebrar outras coisas
  signOut: jest.fn(() => Promise.resolve()),
  getAuth: jest.fn(() => ({})), // Mock básico para getAuth se for usado
}));
jest.mock('@/lib/firebase', () => ({
  auth: { name: 'mockedFirebaseAuth' }, // Mock do objeto auth exportado
}));
jest.mock('@/hooks/use-toast');


const mockUserMetadata: UserMetadata = {
  creationTime: new Date().toISOString(),
  lastSignInTime: new Date().toISOString(),
};
const mockProviderData: UserInfo[] = [];

const baseMockUserProperties = {
  emailVerified: true,
  isAnonymous: false,
  photoURL: null,
  tenantId: null,
  metadata: mockUserMetadata,
  providerData: mockProviderData,
  delete: jest.fn(() => Promise.resolve()),
  getIdToken: jest.fn(() => Promise.resolve('mock-id-token')),
  getIdTokenResult: jest.fn(() => Promise.resolve({ token: 'mock-id-token' } as any)),
  reload: jest.fn(() => Promise.resolve()),
  toJSON: jest.fn(() => ({})),
};

const mockEmployeeUser: User = {
  ...baseMockUserProperties,
  uid: 'emp123',
  name: 'Funcionário Teste',
  email: 'employee@example.com',
  role: 'employee',
  displayName: 'Funcionário Teste',
};

const mockAdminUser: User = {
  ...baseMockUserProperties,
  uid: 'admin123',
  name: 'Admin Teste',
  email: 'admin@example.com',
  role: 'admin',
  displayName: 'Admin Teste',
};

describe('AppSidebar', () => {
  let mockSetUser: jest.Mock;
  let mockUseAuthStore: jest.MockedFunction<typeof useAuthStore>;
  let mockUseRouter: jest.MockedFunction<typeof useRouter>;
  let mockUsePathname: jest.MockedFunction<typeof usePathname>;
  let mockToast: jest.Mock;
  let mockRouterPush: jest.Mock;

  beforeEach(() => {
    mockSetUser = jest.fn();
    mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
    
    mockRouterPush = jest.fn();
    mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
    mockUseRouter.mockReturnValue({ push: mockRouterPush, replace: jest.fn(), prefetch: jest.fn(), back: jest.fn(), forward: jest.fn() });

    mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
    
    mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

    (signOut as jest.Mock).mockClear();
    mockSetUser.mockClear();
    mockToast.mockClear();
    mockRouterPush.mockClear();
  });

  const setup = (currentUser: User | null, currentPath: string = '/dashboard') => {
    mockUseAuthStore.mockReturnValue({
      user: currentUser,
      setUser: mockSetUser,
      isLoading: false,
      setLoading: jest.fn(),
    });
    mockUsePathname.mockReturnValue(currentPath);
    render(<AppSidebar />);
  };

  it('renderiza itens de navegação padrão para usuário funcionário', () => {
    setup(mockEmployeeUser);
    expect(screen.getByText('Painel')).toBeInTheDocument();
    expect(screen.getByText('Catálogo de Livros')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText(mockEmployeeUser.name!)).toBeInTheDocument();
    expect(screen.getByText('Funcionário')).toBeInTheDocument(); // Role
  });

  it('não renderiza "Funcionários" para usuário funcionário', () => {
    setup(mockEmployeeUser);
    expect(screen.queryByText('Funcionários')).not.toBeInTheDocument();
  });

  it('renderiza "Funcionários" para usuário admin', () => {
    setup(mockAdminUser);
    expect(screen.getByText('Funcionários')).toBeInTheDocument();
    expect(screen.getByText(mockAdminUser.name!)).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument(); // Role
  });

  it('chama signOut e atualiza usuário ao clicar em Sair', async () => {
    setup(mockAdminUser);
    const logoutButton = screen.getByRole('button', { name: /Sair/i }); // Ajuste o seletor se necessário
    
    // O botão "Sair" pode estar dentro de um elemento com "group-data-[collapsible=icon]:hidden"
    // Se o sidebar estiver "expandido" (default), o texto "Sair" deve ser visível
    // Se estiver "colapsado", apenas o ícone será visível, e o aria-label pode ser usado.
    // Para o teste, assumimos que o texto "Sair" está acessível.

    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
    });
    expect(mockSetUser).toHaveBeenCalledWith(null);
    expect(mockToast).toHaveBeenCalledWith({ title: 'Logout realizado com sucesso!' });
    expect(mockRouterPush).toHaveBeenCalledWith('/login');
  });

  it('marca o item de menu "Painel" como ativo em /dashboard', () => {
    setup(mockAdminUser, '/dashboard');
    const dashboardLink = screen.getByText('Painel').closest('a'); // Encontra o elemento 'a' pai
    expect(dashboardLink).toHaveAttribute('data-active', 'true');
  });

  it('marca o item de menu "Catálogo de Livros" como ativo em /catalog', () => {
    setup(mockAdminUser, '/catalog');
    const catalogLink = screen.getByText('Catálogo de Livros').closest('a');
    expect(catalogLink).toHaveAttribute('data-active', 'true');
  });
  
  it('marca o item de menu "Catálogo de Livros" como ativo em uma sub-rota de /catalog', () => {
    setup(mockAdminUser, '/catalog/some-book-id');
    const catalogLink = screen.getByText('Catálogo de Livros').closest('a');
    expect(catalogLink).toHaveAttribute('data-active', 'true');
  });

  it('renderiza fallback de avatar se o nome do usuário não estiver disponível', () => {
    const userWithoutName: User = { 
        ...baseMockUserProperties,
        uid: 'userNoName123', 
        email: 'noname@example.com', 
        role: 'employee', 
        displayName: 'noname@example.com', // Firebase pode usar email como displayName
        name: undefined 
    };
    setup(userWithoutName);
    expect(screen.getByText('NO')).toBeInTheDocument(); // Fallback para "noname@example.com" -> NO
  });

  it('lida com erro no signOut', async () => {
    (signOut as jest.Mock).mockRejectedValueOnce(new Error('Sign out failed'));
    setup(mockAdminUser);
    const logoutButton = screen.getByRole('button', { name: /Sair/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
    });
    expect(mockSetUser).not.toHaveBeenCalled(); // Não deve limpar o usuário se o signOut falhar
    expect(mockToast).toHaveBeenCalledWith({ title: 'Erro ao fazer logout', variant: 'destructive' });
    expect(mockRouterPush).not.toHaveBeenCalledWith('/login');
  });

});
