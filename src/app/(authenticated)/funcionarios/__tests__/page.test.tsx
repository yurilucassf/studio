
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FuncionariosPage from '../page';
import type { Employee, User } from '@/lib/types';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useRouter } from 'next/navigation';
import type { UserMetadata, UserInfo } from 'firebase/auth';

// Mock 'firebase/firestore'
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn((queryObj, ..._constraints) => queryObj),
  orderBy: jest.fn(() => ({ type: 'orderBy' })),
}));

// Mock 'firebase/auth'
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  deleteUser: jest.fn(), // Manter, embora não usado diretamente na lógica de exclusão do componente
  getAuth: jest.fn(() => ({ currentUser: { uid: 'admin1' } })), // Mock básico para getAuth
}));

// Importar as funções mockadas para configuração
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
  db: { app: {} },
  auth: { name: 'mockedFirebaseAuth' }, // Objeto auth mockado
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

// Mock componentes filhos
jest.mock('@/components/funcionarios/employee-card', () => ({
  EmployeeCard: jest.fn(({ employee, onEdit, onDelete, currentUserId, isLastAdmin }) => (
    <div data-testid={`employee-card-${employee.id}`}>
      <h5>{employee.name}</h5>
      <button data-testid={`employee-card-${employee.id}-edit-button`} onClick={() => onEdit(employee)} disabled={currentUserId === employee.id && isLastAdmin && employee.role === 'admin'}>Editar</button>
      {/* Simular AlertDialogTrigger para delete */}
      <button
        data-testid={`employee-card-${employee.id}-delete-button`}
        onClick={() => {
            if (global.confirm('Tem certeza que deseja excluir este funcionário? A conta de autenticação associada NÃO será excluída automaticamente e precisará ser removida manually do Firebase Console.')) {
                onDelete(employee.id, employee.role);
            }
        }}
        disabled={currentUserId === employee.id || (isLastAdmin && employee.role === 'admin')}
      >
        Excluir
      </button>
    </div>
  )),
}));


const mockNewEmployeeData = { name: 'Novo Funcionário Mock', email: 'novo_func@example.com', password: 'password123', role: 'employee' as 'employee' | 'admin' };
const mockEditEmployeeData = { name: 'Nome Atualizado Mock', role: 'employee' as 'employee' | 'admin' };

jest.mock('@/components/funcionarios/employee-form', () => ({
  EmployeeForm: jest.fn(({ onSubmit, onCancel, initialData, isSubmitting }) => (
    <form data-testid="employee-form" onSubmit={(e) => {
        e.preventDefault();
        if (initialData) {
            onSubmit(mockEditEmployeeData);
        } else {
            onSubmit(mockNewEmployeeData);
        }
    }}>
      <button type="submit" disabled={isSubmitting}>Salvar Funcionário (Form Mock)</button>
      <button type="button" onClick={onCancel} disabled={isSubmitting}>Cancelar (Form Mock)</button>
    </form>
  )),
}));

const mockUserMetadata: UserMetadata = {
  creationTime: new Date().toISOString(),
  lastSignInTime: new Date().toISOString(),
};

const mockProviderData: UserInfo[] = []; // Empty array is fine if not specifically used

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
  toJSON: jest.fn(() => ({ uid: 'admin1', email: 'admin@example.com', name: 'Usuário Admin', role: 'admin' })),
};
const mockEmployeeUser: User = {
  ...baseMockUserProperties,
  uid: 'emp1',
  email: 'emp@example.com',
  name: 'Usuário Funcionário',
  displayName: 'Usuário Funcionário',
  role: 'employee',
  toJSON: jest.fn(() => ({ uid: 'emp1', email: 'emp@example.com', name: 'Usuário Funcionário', role: 'employee' })),
};

const mockEmployees: Employee[] = [
  { id: 'admin1', name: 'Usuário Admin', email: 'admin@example.com', role: 'admin' },
  { id: 'emp2', name: 'Joana Silva', email: 'joana@example.com', role: 'employee' },
];

describe('PaginaDeFuncionarios', () => {
  beforeEach(() => {
    (getDocs as jest.Mock).mockReset();
    (setDoc as jest.Mock).mockReset().mockResolvedValue(undefined);
    (updateDoc as jest.Mock).mockReset().mockResolvedValue(undefined);
    (deleteDoc as jest.Mock).mockReset().mockResolvedValue(undefined);
    (createUserWithEmailAndPassword as jest.Mock).mockReset().mockResolvedValue({ user: { uid: 'novo-auth-uid' } });
    (collection as jest.Mock).mockReset().mockImplementation((_db, path) => ({ type: 'collectionRef', path }));
    (doc as jest.Mock).mockReset().mockImplementation((_db, path, id) => ({ type: 'docRef', path, id }));

    mockToast.mockClear();
    mockRouterReplace.mockClear();
    mockUseRouter.mockReturnValue({ replace: mockRouterReplace, push: jest.fn() });
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  it('redireciona usuários não-admin e mostra toast', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockEmployeeUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] }); // Mock para fetchEmployees não falhar

    render(<FuncionariosPage />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "Acesso Negado", description: "Você não tem permissão para acessar esta página.", variant: "destructive" });
      expect(mockRouterReplace).toHaveBeenCalledWith('/dashboard');
      expect(screen.getByText(/Acesso Negado/i)).toBeInTheDocument();
    });
  });

  it('renderiza estado de carregamento inicialmente para admin e depois exibe funcionários', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockEmployees.map(e => ({ id: e.id, data: () => e })) });

    render(<FuncionariosPage />);
    expect(screen.getByText(/Carregando\.\.\./i)).toBeInTheDocument();


    await waitFor(() => {
      expect(screen.getByText('Usuário Admin')).toBeInTheDocument();
      expect(screen.getByText('Joana Silva')).toBeInTheDocument();
    });
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it('exibe estado de vazio para admin se nenhum funcionário for encontrado', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] });

    render(<FuncionariosPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum funcionário encontrado/i)).toBeInTheDocument();
    });
  });

  it('abre EmployeeForm quando o botão "Adicionar Novo Funcionário" é clicado por admin', async () => {
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

  it('adiciona um novo funcionário com sucesso para admin', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [] }) // Carga inicial
      .mockResolvedValueOnce({ docs: [{ id: 'novo-auth-uid', data: () => ({ name: mockNewEmployeeData.name, email: mockNewEmployeeData.email, role: mockNewEmployeeData.role }) }]}); // Após adicionar

    render(<FuncionariosPage />);
    await screen.findByText(/Nenhum funcionário encontrado/i);

    fireEvent.click(screen.getByRole('button', { name: /Adicionar Novo Funcionário/i }));
    await screen.findByTestId('employee-form');

    fireEvent.submit(screen.getByTestId('employee-form'));

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), mockNewEmployeeData.email, mockNewEmployeeData.password);
      expect(setDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'employees', id: 'novo-auth-uid' }), {
        name: mockNewEmployeeData.name,
        email: mockNewEmployeeData.email,
        role: mockNewEmployeeData.role,
      });
      expect(mockToast).toHaveBeenCalledWith({ title: 'Funcionário adicionado com sucesso!' });
    });
    await waitFor(() => expect(screen.getByText(mockNewEmployeeData.name)).toBeInTheDocument());
  });

  it('edita um funcionário existente com sucesso para admin', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    const editableEmployee = mockEmployees[1]; // Joana Silva
     (getDocs as jest.Mock)
        .mockResolvedValueOnce({ docs: mockEmployees.map(e => ({ id: e.id, data: () => e })) }) // Carga inicial
        .mockResolvedValueOnce({ docs: mockEmployees.map(e => e.id === editableEmployee.id ? { id: e.id, data: () => ({...e, name: mockEditEmployeeData.name, role: mockEditEmployeeData.role })} : {id: e.id, data: () => e}) }); // Após editar

    render(<FuncionariosPage />);
    await screen.findByText(editableEmployee.name);

    fireEvent.click(screen.getByTestId(`employee-card-${editableEmployee.id}-edit-button`));

    await screen.findByTestId('employee-form');
    fireEvent.submit(screen.getByTestId('employee-form'));

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledTimes(1);
      expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'docRef', path: 'employees', id: editableEmployee.id }),
        { name: mockEditEmployeeData.name, role: mockEditEmployeeData.role }
      );
      expect(mockToast).toHaveBeenCalledWith({ title: 'Funcionário atualizado com sucesso!' });
    });
     await waitFor(() => expect(screen.getByText(mockEditEmployeeData.name)).toBeInTheDocument());
  });

  it('exclui um funcionário com sucesso para admin', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    const employeeToDelete = mockEmployees[1]; // Joana Silva (não admin)
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: mockEmployees.map(e => ({ id: e.id, data: () => e })) }) // Carga inicial
      .mockResolvedValueOnce({ docs: [mockEmployees[0]].map(e => ({ id: e.id, data: () => e })) }); // Após excluir

    render(<FuncionariosPage />);
    await screen.findByText(employeeToDelete.name);

    fireEvent.click(screen.getByTestId(`employee-card-${employeeToDelete.id}-delete-button`));

    expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('Tem certeza que deseja excluir este funcionário?'));

    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalledTimes(1);
      expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'docRef', path: 'employees', id: employeeToDelete.id }));
      expect(mockToast).toHaveBeenCalledWith({ title: 'Funcionário excluído do Firestore!', description: 'Lembre-se de remover a conta do Firebase Authentication manualmente.' });
    });
    await waitFor(() => expect(screen.queryByText(employeeToDelete.name)).not.toBeInTheDocument());
  });

  // Testes de tratamento de erro
  it('lida com erro ao buscar funcionários', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error('Falha ao buscar'));
    render(<FuncionariosPage />);
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "Erro ao buscar funcionários", variant: "destructive" });
    });
  });

  it('lida com erro ao adicionar funcionário (falha na criação de auth)', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] }); // Carga inicial
    (createUserWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({ code: 'auth/email-already-in-use', message: 'Email já em uso.' });

    render(<FuncionariosPage />);
    await screen.findByText(/Nenhum funcionário encontrado/i);
    fireEvent.click(screen.getByRole('button', { name: /Adicionar Novo Funcionário/i }));
    await screen.findByTestId('employee-form');
    fireEvent.submit(screen.getByTestId('employee-form'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "Erro de Autenticação", description: "Email já em uso.", variant: "destructive" });
    });
  });

  it('lida com erro ao adicionar funcionário (falha ao salvar no firestore)', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] }); // Carga inicial
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({ user: { uid: 'novo-auth-uid' }});
    (setDoc as jest.Mock).mockRejectedValueOnce(new Error('Falha ao salvar Firestore'));

    render(<FuncionariosPage />);
    await screen.findByText(/Nenhum funcionário encontrado/i);
    fireEvent.click(screen.getByRole('button', { name: /Adicionar Novo Funcionário/i }));
    await screen.findByTestId('employee-form');
    fireEvent.submit(screen.getByTestId('employee-form'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "Erro ao salvar funcionário", variant: "destructive" });
    });
  });


  it('lida com erro ao editar funcionário', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    const employeeToEdit = mockEmployees[1];
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockEmployees.map(e => ({ id: e.id, data: () => e })) });
    (updateDoc as jest.Mock).mockRejectedValueOnce(new Error('Falha ao atualizar funcionário'));

    render(<FuncionariosPage />);
    await screen.findByText(employeeToEdit.name);
    fireEvent.click(screen.getByTestId(`employee-card-${employeeToEdit.id}-edit-button`));
    await screen.findByTestId('employee-form');
    fireEvent.submit(screen.getByTestId('employee-form'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "Erro ao salvar funcionário", variant: "destructive" });
    });
  });

  it('lida com erro ao excluir funcionário do Firestore', async () => {
    mockUseAuthStore.mockReturnValue({ user: mockAdminUser, isLoading: false, setUser: jest.fn(), setLoading: jest.fn() });
    const employeeToDelete = mockEmployees[1];
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockEmployees.map(e => ({ id: e.id, data: () => e })) });
    (deleteDoc as jest.Mock).mockRejectedValueOnce(new Error('Falha ao excluir Firestore'));

    render(<FuncionariosPage />);
    await screen.findByText(employeeToDelete.name);
    fireEvent.click(screen.getByTestId(`employee-card-${employeeToDelete.id}-delete-button`));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: "Erro ao excluir funcionário do Firestore", variant: "destructive" });
    });
  });
});
