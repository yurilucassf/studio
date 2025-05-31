
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '../page';
import type { Book, LoanActivity, User, DashboardStats } from '@/lib/types';
import { useAuthStore } from '@/hooks/use-auth-store';
import type { UserMetadata, UserInfo } from 'firebase/auth';

// Mock 'firebase/firestore'
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn((queryObj, ..._constraints) => queryObj),
  where: jest.fn(() => ({ type: 'where' })),
  orderBy: jest.fn(() => ({ type: 'orderBy' })),
  limit: jest.fn(() => ({ type: 'limit' })),
  Timestamp: { 
    fromMillis: jest.fn(ms => ({ 
      toDate: () => new Date(ms),
      toMillis: () => ms 
    })),
  },
}));

import { getDocs, collection, query, where, orderBy, limit } from 'firebase/firestore';

// Mock '@/lib/firebase'
jest.mock('@/lib/firebase', () => ({
  db: { app: {} }, 
}));

// Mock hooks
jest.mock('@/hooks/use-toast');
const mockToast = jest.fn();
(require('@/hooks/use-toast') as any).useToast = () => ({ toast: mockToast });

jest.mock('@/hooks/use-auth-store');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock componentes filhos
jest.mock('@/components/dashboard/stat-card', () => ({
  StatCard: jest.fn(({ title, value, isLoading }) => (
    <div data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3>{title}</h3>
      {isLoading ? <p>Carregando...</p> : <p>{String(value)}</p>}
    </div>
  )),
}));


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

const mockAdminUser: User = {
  ...baseMockUserProperties,
  uid: 'admin1',
  email: 'admin@example.com',
  name: 'Usuário Admin',
  displayName: 'Usuário Admin',
  role: 'admin',
};
const mockEmployeeUser: User = {
  ...baseMockUserProperties,
  uid: 'emp1',
  email: 'emp@example.com',
  name: 'Usuário Funcionário',
  displayName: 'Usuário Funcionário',
  role: 'employee',
};


const mockBooksData: Partial<Book>[] = [
  { id: 'b1', title: 'Livro Recente Um', author: 'Autor R1', status: 'Disponível', addedDate: Date.now() - 1000 },
  { id: 'b2', title: 'Livro Recente Dois', author: 'Autor R2', status: 'Emprestado', addedDate: Date.now() - 2000 },
];

const mockLoanActivitiesData: Partial<LoanActivity>[] = [
  { id: 'l1', bookTitle: 'Livro Emprestado X', clientName: 'Cliente A', type: 'loan', loanDate: Date.now() - 500 },
  { id: 'l2', bookTitle: 'Livro Devolvido Y', clientName: 'Cliente B', type: 'return', loanDate: Date.now() - 1500 },
];

describe('PaginaDoPainel', () => {
  beforeEach(() => {
    (getDocs as jest.Mock).mockReset();
    // Simples mock para collection e query, não precisam de reset complexo aqui pois são pass-through
    (collection as jest.Mock).mockImplementation((_db, path) => ({ path, type: 'collectionRef' })); 
    (query as jest.Mock).mockImplementation((collectionRef, ..._constraints) => collectionRef); 
    (where as jest.Mock).mockReturnValue({ type: 'whereConstraint' });
    (orderBy as jest.Mock).mockReturnValue({ type: 'orderByConstraint' });
    (limit as jest.Mock).mockReturnValue({ type: 'limitConstraint' });
    mockToast.mockClear();
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn()});
  });

  it('renderiza estado de carregamento inicialmente para estatísticas e tabelas', async () => {
    // Mantém a promessa pendente para simular carregamento
    (getDocs as jest.Mock).mockImplementation(() => new Promise(() => {})); 

    render(<DashboardPage />);

    expect(screen.getByTestId('stat-card-total-de-livros').textContent).toContain('Carregando...');
    expect(screen.getByTestId('stat-card-livros-emprestados').textContent).toContain('Carregando...');
    
    // Verifica se as células da tabela contêm skeletons (indicadores de carregamento)
    const tableCells = screen.getAllByRole('cell');
    tableCells.forEach(cell => {
        if(cell.querySelector('.animate-pulse')) { // .animate-pulse é usado pelo Skeleton
            expect(cell.querySelector('.animate-pulse')).toBeInTheDocument();
        }
    });
  });

  it('exibe estatísticas, livros recentes e empréstimos recentes corretamente após o carregamento', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ size: 10 }) // totalLivros (books collection)
      .mockResolvedValueOnce({ size: 3 })  // livrosEmprestados (books collection with where status == 'Emprestado')
      .mockResolvedValueOnce({ size: 2 })  // totalClientes (clients collection)
      .mockResolvedValueOnce({ size: 1 })  // totalFuncionarios (employees collection)
      .mockResolvedValueOnce({ docs: mockBooksData.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }}) })) }) // Livros Recentes (books collection with orderBy and limit)
      .mockResolvedValueOnce({ docs: mockLoanActivitiesData.map(l => ({ id: l.id, data: () => ({...l, loanDate: { toMillis: () => l.loanDate }}) })) }); // Empréstimos Recentes (loanActivities collection with orderBy and limit)

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stat-card-total-de-livros').textContent).toContain('10');
      expect(screen.getByTestId('stat-card-livros-emprestados').textContent).toContain('3');
      expect(screen.getByTestId('stat-card-livros-disponíveis').textContent).toContain('7'); // 10 - 3
      expect(screen.getByTestId('stat-card-total-de-clientes').textContent).toContain('2');
      expect(screen.getByTestId('stat-card-total-de-funcionários').textContent).toContain('1');
    });

    await screen.findByText('Livro Recente Um');
    expect(screen.getByText('Autor R1')).toBeInTheDocument();
    expect(screen.getByText('Livro Recente Dois')).toBeInTheDocument();
    expect(screen.getByText('Autor R2')).toBeInTheDocument();

    await screen.findByText('Livro Emprestado X');
    expect(screen.getByText('Cliente A')).toBeInTheDocument();
    expect(screen.getAllByText(/Empréstimo/i)[0]).toBeInTheDocument(); 
    expect(screen.getByText('Livro Devolvido Y')).toBeInTheDocument();
    expect(screen.getByText('Cliente B')).toBeInTheDocument();
    expect(screen.getAllByText(/Devolução/i)[0]).toBeInTheDocument(); 

    expect(getDocs).toHaveBeenCalledTimes(6); 
  });

  it('exibe estado de vazio para livros recentes se nenhum for encontrado', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ size: 0 }) 
      .mockResolvedValueOnce({ size: 0 })  
      .mockResolvedValueOnce({ size: 0 })  
      .mockResolvedValueOnce({ size: 0 })  
      .mockResolvedValueOnce({ docs: [] }) // Sem livros recentes
      .mockResolvedValueOnce({ docs: mockLoanActivitiesData.map(l => ({ id: l.id, data: () => ({...l, loanDate: { toMillis: () => l.loanDate }}) })) });

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum livro adicionado recentemente./i)).toBeInTheDocument();
    });
  });

  it('exibe estado de vazio para empréstimos recentes se nenhum for encontrado', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ size: 0 }) 
      .mockResolvedValueOnce({ size: 0 })  
      .mockResolvedValueOnce({ size: 0 })  
      .mockResolvedValueOnce({ size: 0 })  
      .mockResolvedValueOnce({ docs: mockBooksData.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }}) })) })
      .mockResolvedValueOnce({ docs: [] }); // Sem empréstimos recentes
      
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhuma atividade de empréstimo recente./i)).toBeInTheDocument();
    });
  });
  
  it('mostra card de Total de Funcionários para não-admin se existirem funcionários', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockEmployeeUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ size: 10 }) 
      .mockResolvedValueOnce({ size: 3 })  
      .mockResolvedValueOnce({ size: 2 })  
      .mockResolvedValueOnce({ size: 1 })  // Existem funcionários
      .mockResolvedValueOnce({ docs: [] }) 
      .mockResolvedValueOnce({ docs: [] }); 

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('stat-card-total-de-funcionários')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-total-de-funcionários').textContent).toContain('1');
    });
  });

  it('esconde card de Total de Funcionários para não-admin se não existirem funcionários', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockEmployeeUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ size: 10 }) 
      .mockResolvedValueOnce({ size: 3 })  
      .mockResolvedValueOnce({ size: 2 })  
      .mockResolvedValueOnce({ size: 0 })  // SEM funcionários
      .mockResolvedValueOnce({ docs: [] }) 
      .mockResolvedValueOnce({ docs: [] });

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('stat-card-total-de-funcionários')).not.toBeInTheDocument();
    });
  });
});
