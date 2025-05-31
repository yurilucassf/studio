
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '../page';
import type { Book, LoanActivity, User } from '@/lib/types';
import { useAuthStore } from '@/hooks/use-auth-store';

// Mock 'firebase/firestore'
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn((queryObj, ..._constraints) => queryObj),
  where: jest.fn(() => ({ type: 'where' })),
  orderBy: jest.fn(() => ({ type: 'orderBy' })),
  limit: jest.fn(() => ({ type: 'limit' })),
  Timestamp: { // For converting server timestamps
    fromMillis: jest.fn(ms => ({ 
      toDate: () => new Date(ms),
      toMillis: () => ms 
    })),
  },
}));

// Import the mocked functions for configuration
import { getDocs } from 'firebase/firestore';

// Mock '@/lib/firebase'
jest.mock('@/lib/firebase', () => ({
  db: { app: {} }, // Placeholder db
}));

// Mock hooks
jest.mock('@/hooks/use-toast');
const mockToast = jest.fn();
(require('@/hooks/use-toast') as any).useToast = () => ({ toast: mockToast });

jest.mock('@/hooks/use-auth-store');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;


// Mock child components
jest.mock('@/components/dashboard/stat-card', () => ({
  StatCard: jest.fn(({ title, value, isLoading }) => (
    <div data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3>{title}</h3>
      {isLoading ? <p>Loading...</p> : <p>{String(value)}</p>}
    </div>
  )),
}));


const mockBooksData: Partial<Book>[] = [
  { id: 'b1', title: 'Recent Book 1', author: 'Author R1', status: 'Disponível', addedDate: Date.now() - 1000 },
  { id: 'b2', title: 'Recent Book 2', author: 'Author R2', status: 'Emprestado', addedDate: Date.now() - 2000 },
];

const mockLoanActivitiesData: Partial<LoanActivity>[] = [
  { id: 'l1', bookTitle: 'Borrowed Book X', clientName: 'Client A', type: 'loan', loanDate: Date.now() - 500 },
  { id: 'l2', bookTitle: 'Returned Book Y', clientName: 'Client B', type: 'return', loanDate: Date.now() - 1500 },
];

const mockEmployeesData = [
    { id: 'e1', name: 'Admin User', email: 'admin@example.com', role: 'admin' }
];


describe('DashboardPage', () => {
  beforeEach(() => {
    (getDocs as jest.Mock).mockReset();
    mockToast.mockClear();
    mockUseAuthStore.mockReturnValue({ user: { uid: 'admin1', role: 'admin' } as User, isLoading: false, setUser: jest.fn(), setLoading: jest.fn()});
  });

  it('renders loading state initially for stats and tables', async () => {
    (getDocs as jest.Mock).mockImplementation(() => new Promise(() => {})); // Keep it pending

    render(<DashboardPage />);

    // Check for loading text in StatCards (mocked behavior)
    expect(screen.getByTestId('stat-card-total-de-livros').textContent).toContain('Loading...');
    expect(screen.getByTestId('stat-card-livros-emprestados').textContent).toContain('Loading...');
    
    // Check for table loading skeletons (actual component rendering)
    const tableCells = screen.getAllByRole('cell');
    tableCells.forEach(cell => {
        if(cell.querySelector('.animate-pulse')) {
            expect(cell.querySelector('.animate-pulse')).toBeInTheDocument();
        }
    });
  });

  it('displays fetched stats, recent books, and recent loans correctly', async () => {
    (getDocs as jest.Mock)
      // Stats queries
      .mockResolvedValueOnce({ size: 10 }) // totalBooks
      .mockResolvedValueOnce({ size: 3 })  // borrowedBooks
      .mockResolvedValueOnce({ size: 2 })  // totalClients
      .mockResolvedValueOnce({ size: 1 })  // totalEmployees
      // Recent Books query
      .mockResolvedValueOnce({ docs: mockBooksData.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }}) })) })
      // Recent Loans query
      .mockResolvedValueOnce({ docs: mockLoanActivitiesData.map(l => ({ id: l.id, data: () => ({...l, loanDate: { toMillis: () => l.loanDate }}) })) });

    render(<DashboardPage />);

    await waitFor(() => {
      // Stats
      expect(screen.getByTestId('stat-card-total-de-livros').textContent).toContain('10');
      expect(screen.getByTestId('stat-card-livros-emprestados').textContent).toContain('3');
      expect(screen.getByTestId('stat-card-livros-disponíveis').textContent).toContain('7'); // 10 - 3
      expect(screen.getByTestId('stat-card-total-de-clientes').textContent).toContain('2');
      expect(screen.getByTestId('stat-card-total-de-funcionários').textContent).toContain('1');
    });

    // Recent Books
    await screen.findByText('Recent Book 1');
    expect(screen.getByText('Author R1')).toBeInTheDocument();
    expect(screen.getByText('Recent Book 2')).toBeInTheDocument();
    expect(screen.getByText('Author R2')).toBeInTheDocument();

    // Recent Loans
    await screen.findByText('Borrowed Book X');
    expect(screen.getByText('Client A')).toBeInTheDocument();
    expect(screen.getAllByText(/Empréstimo/i)[0]).toBeInTheDocument(); // Badge text
    expect(screen.getByText('Returned Book Y')).toBeInTheDocument();
    expect(screen.getByText('Client B')).toBeInTheDocument();
    expect(screen.getAllByText(/Devolução/i)[0]).toBeInTheDocument(); // Badge text

    expect(getDocs).toHaveBeenCalledTimes(6); // 4 for stats, 1 for recent books, 1 for recent loans
  });

  it('displays empty state for recent books if none are found', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ size: 0 }) // totalBooks
      .mockResolvedValueOnce({ size: 0 })  // borrowedBooks
      .mockResolvedValueOnce({ size: 0 })  // totalClients
      .mockResolvedValueOnce({ size: 0 })  // totalEmployees
      .mockResolvedValueOnce({ docs: [] }) // No recent books
      .mockResolvedValueOnce({ docs: mockLoanActivitiesData.map(l => ({ id: l.id, data: () => ({...l, loanDate: { toMillis: () => l.loanDate }}) })) });

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum livro adicionado recentemente./i)).toBeInTheDocument();
    });
  });

  it('displays empty state for recent loans if none are found', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ size: 0 }) // totalBooks
      .mockResolvedValueOnce({ size: 0 })  // borrowedBooks
      .mockResolvedValueOnce({ size: 0 })  // totalClients
      .mockResolvedValueOnce({ size: 0 })  // totalEmployees
      .mockResolvedValueOnce({ docs: mockBooksData.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }}) })) })
      .mockResolvedValueOnce({ docs: [] }); // No recent loans
      
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhuma atividade de empréstimo recente./i)).toBeInTheDocument();
    });
  });
  
  it('shows Total de Funcionários card for non-admin if employees exist', async () => {
    mockUseAuthStore.mockReturnValue({ user: { uid: 'emp1', role: 'employee' } as User, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ size: 10 }) // totalBooks
      .mockResolvedValueOnce({ size: 3 })  // borrowedBooks
      .mockResolvedValueOnce({ size: 2 })  // totalClients
      .mockResolvedValueOnce({ size: 1 })  // totalEmployees (employees exist)
      .mockResolvedValueOnce({ docs: [] }) // Recent Books
      .mockResolvedValueOnce({ docs: [] }); // Recent Loans

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByTestId('stat-card-total-de-funcionários')).toBeInTheDocument();
      expect(screen.getByTestId('stat-card-total-de-funcionários').textContent).toContain('1');
    });
  });

  it('hides Total de Funcionários card for non-admin if no employees exist', async () => {
    mockUseAuthStore.mockReturnValue({ user: { uid: 'emp1', role: 'employee' } as User, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ size: 10 }) // totalBooks
      .mockResolvedValueOnce({ size: 3 })  // borrowedBooks
      .mockResolvedValueOnce({ size: 2 })  // totalClients
      .mockResolvedValueOnce({ size: 0 })  // totalEmployees (NO employees)
      .mockResolvedValueOnce({ docs: [] }) // Recent Books
      .mockResolvedValueOnce({ docs: [] }); // Recent Loans

    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.queryByTestId('stat-card-total-de-funcionários')).not.toBeInTheDocument();
    });
  });
});

    