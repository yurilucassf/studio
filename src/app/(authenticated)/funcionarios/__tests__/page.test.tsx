
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FuncionariosPage from '../page';
import type { Employee, User } from '@/lib/types';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useRouter } from 'next/navigation';

// Mock 'firebase/firestore'
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(), // Though setDoc is used for adding with UID
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn((queryObj, ..._constraints) => queryObj),
  orderBy: jest.fn(() => ({ type: 'orderBy' })),
}));

// Mock 'firebase/auth'
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  deleteUser: jest.fn(), // Though not directly called by component, good to have if logic changes
  // getAuth: jest.fn() // If your firebase.ts calls getAuth() which is typical
}));


// Import the mocked functions for configuration
import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';


// Mock '@/lib/firebase'
jest.mock('@/lib/firebase', () => ({
  db: { app: {} }, // Placeholder db
  auth: { name: 'mockedFirebaseAuth' }, // Placeholder auth, matching component's firebaseAuth
}));

// Mock hooks
jest.mock('@/hooks/use-toast');
const mockToast = jest.fn();
(require('@/hooks/use-toast') as any).useToast = () => ({ toast: mockToast });

jest.mock('@/hooks/use-auth-store');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

jest.mock('next/navigation');
const mockUseRouter = useRouter as jest.Mock;
const mockRouterReplace = jest.fn();

// Mock child components
jest.mock('@/components/funcionarios/employee-card', () => ({
  EmployeeCard: jest.fn(({ employee, onEdit, onDelete }) => (
    <div data-testid={`employee-card-${employee.id}`}>
      <h5>{employee.name}</h5>
      <button onClick={() => onEdit(employee)}>Edit</button>
      <button onClick={() => onDelete(employee.id, employee.role)}>Delete</button>
    </div>
  )),
}));

jest.mock('@/components/funcionarios/employee-form', () => ({
  EmployeeForm: jest.fn(({ onSubmit, onCancel, initialData, isSubmitting }) => (
    <form data-testid="employee-form" onSubmit={(e) => { 
        e.preventDefault(); 
        if (initialData) { // Edit
            onSubmit({ name: 'Updated Name', role: 'employee' });
        } else { // Add
            onSubmit({ name: 'New Employee', email: 'newemp@example.com', password: 'password123', role: 'employee' });
        }
    }}>
      <button type="submit" disabled={isSubmitting}>Save Employee Form</button>
      <button type="button" onClick={onCancel} disabled={isSubmitting}>Cancel Employee Form</button>
    </form>
  )),
}));


const mockAdminUser: User = { uid: 'admin1', email: 'admin@example.com', name: 'Admin User', role: 'admin' };
const mockEmployeeUser: User = { uid: 'emp1', email: 'emp@example.com', name: 'Employee User', role: 'employee' };

const mockEmployees: Employee[] = [
  { id: 'admin1', name: 'Admin User', email: 'admin@example.com', role: 'admin' },
  { id: 'emp2', name: 'Jane Doe', email: 'jane@example.com', role: 'employee' },
];

describe('FuncionariosPage', () => {
  beforeEach(() => {
    (getDocs as jest.Mock).mockReset();
    (setDoc as jest.Mock).mockReset().mockResolvedValue(undefined);
    (updateDoc as jest.Mock).mockReset().mockResolvedValue(undefined);
    (deleteDoc as jest.Mock).mockReset().mockResolvedValue(undefined);
    (createUserWithEmailAndPassword as jest.Mock).mockReset().mockResolvedValue({ user: { uid: 'new-auth-uid' } });
    (collection as jest.Mock).mockReset().mockImplementation((_db, path) => ({ type: 'collectionRef', path }));
    (doc as jest.Mock).mockReset().mockImplementation((_db, path, id) => ({ type: 'docRef', path, id }));
    
    mockToast.mockClear();
    mockRouterReplace.mockClear();
    mockUseRouter.mockReturnValue({ replace: mockRouterReplace, push: jest.fn() });
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  it('redirects non-admin users and shows toast', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockEmployeeUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] }); // fetchEmployees call

    render(<FuncionariosPage />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "Acesso Negado", description: "Você não tem permissão para acessar esta página.", variant: "destructive" });
      expect(mockRouterReplace).toHaveBeenCalledWith('/dashboard');
      // Check for access denied message if component renders it before redirect completes fully
      expect(screen.getByText(/Acesso Negado/i)).toBeInTheDocument();
    });
  });
  
  it('renders loading state initially for admin then displays employees', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockEmployees.map(e => ({ id: e.id, data: () => e })) });

    render(<FuncionariosPage />);
    // Initial render might show loading or brief "access denied" if isLoadingPage flips fast.
    // The key is to wait for the final state.
    // If isLoadingPage is initially true, the "Carregando funcionários..." will show.
    expect(screen.getByText(/Carregando funcionários.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it('displays empty state for admin if no employees are found', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] }); 

    render(<FuncionariosPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum funcionário encontrado/i)).toBeInTheDocument();
    });
  });

  it('opens EmployeeForm when "Adicionar Novo Funcionário" button is clicked by admin', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] });

    render(<FuncionariosPage />);
    await waitFor(() => expect(screen.queryByTestId('employee-form')).not.toBeInTheDocument());
    
    const addButton = screen.getByRole('button', { name: /Adicionar Novo Funcionário/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('employee-form')).toBeInTheDocument();
    });
  });

  it('adds a new employee successfully for admin', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock) // For fetchEmployees
      .mockResolvedValueOnce({ docs: [] }) // Initial
      .mockResolvedValueOnce({ docs: [{ id: 'new-auth-uid', data: () => ({ name: 'New Employee', email: 'newemp@example.com', role: 'employee' }) }]}); // After add

    render(<FuncionariosPage />);
    await screen.findByText(/Nenhum funcionário encontrado/i);

    fireEvent.click(screen.getByRole('button', { name: /Adicionar Novo Funcionário/i }));
    await screen.findByTestId('employee-form');
    
    fireEvent.submit(screen.getByTestId('employee-form'));

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'newemp@example.com', 'password123');
      expect(setDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'employees', id: 'new-auth-uid' }), {
        name: 'New Employee',
        email: 'newemp@example.com',
        role: 'employee',
      });
      expect(mockToast).toHaveBeenCalledWith({ title: 'Funcionário adicionado com sucesso!' });
    });
    await waitFor(() => expect(screen.getByText('New Employee')).toBeInTheDocument());
  });

  it('edits an existing employee successfully for admin', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    const editableEmployee = mockEmployees[1]; // Jane Doe
     (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockEmployees.map(e => ({ id: e.id, data: () => e })) });
      
    render(<FuncionariosPage />);
    await screen.findByText(editableEmployee.name);

    const employeeCard = screen.getByTestId(`employee-card-${editableEmployee.id}`);
    fireEvent.click(employeeCard.querySelector('button[aria-label="Editar"], button:not([aria-label="Excluir"])')!);

    await screen.findByTestId('employee-form'); 
    fireEvent.submit(screen.getByTestId('employee-form'));

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledTimes(1);
      expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'docRef', path: 'employees', id: editableEmployee.id }), 
        { name: 'Updated Name', role: 'employee' } // From the mock EmployeeForm's onSubmit
      );
      expect(mockToast).toHaveBeenCalledWith({ title: 'Funcionário atualizado com sucesso!' });
    });
  });

  it('deletes an employee successfully for admin', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    const employeeToDelete = mockEmployees[1]; // Jane Doe
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: mockEmployees.map(e => ({ id: e.id, data: () => e })) }) // Initial load
      .mockResolvedValueOnce({ docs: [mockEmployees[0]].map(e => ({ id: e.id, data: () => e })) }); // After delete

    render(<FuncionariosPage />);
    await screen.findByText(employeeToDelete.name);
    
    const employeeCard = screen.getByTestId(`employee-card-${employeeToDelete.id}`);
    fireEvent.click(employeeCard.querySelectorAll('button')[1]); // Assuming delete is the second button

    expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('Tem certeza que deseja excluir este funcionário?'));
    
    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalledTimes(1);
      expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'docRef', path: 'employees', id: employeeToDelete.id }));
      expect(mockToast).toHaveBeenCalledWith({ title: 'Funcionário excluído do Firestore!', description: 'Lembre-se de remover a conta do Firebase Authentication manualmente.' });
    });
    await waitFor(() => expect(screen.queryByText(employeeToDelete.name)).not.toBeInTheDocument());
  });
});

    