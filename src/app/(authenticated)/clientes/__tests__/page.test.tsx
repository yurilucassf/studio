
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClientesPage from '../page';
import type { Client } from '@/lib/types';

// Mock 'firebase/firestore'
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn((queryObj, ..._constraints) => queryObj),
  orderBy: jest.fn(() => ({ type: 'orderBy' })),
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date(),
      toMillis: () => Date.now(),
    })),
    fromMillis: jest.fn(ms => ({
      toDate: () => new Date(ms),
      toMillis: () => ms,
    })),
  },
}));

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';


jest.mock('@/lib/firebase', () => ({
  db: { app: {} }, 
}));


jest.mock('@/hooks/use-toast');
const mockToast = jest.fn();
(require('@/hooks/use-toast') as any).useToast = () => ({ toast: mockToast });


jest.mock('@/components/clientes/client-card', () => ({
  ClientCard: jest.fn(({ client, onEdit, onDelete }) => (
    <div data-testid={`client-card-${client.id}`}>
      <h4>{client.name}</h4>
      <button data-testid={`client-card-${client.id}-edit-button`} onClick={() => onEdit(client)}>Editar</button>
      <button data-testid={`client-card-${client.id}-delete-button`} onClick={() => onDelete(client.id)}>Excluir</button>
    </div>
  )),
}));

const mockClientFormData = { name: 'Cliente Mockado Editado', email: 'editado@example.com', phone: '000000000' };
jest.mock('@/components/clientes/client-form', () => ({
  ClientForm: jest.fn(({ onSubmit, onCancel, initialData }) => (
    <form data-testid="client-form" onSubmit={(e) => { 
        e.preventDefault(); 
        // Se initialData existe, significa que estamos editando, então submetemos os dados de edição mockados.
        // Se não, estamos adicionando, então submetemos os dados de adição mockados.
        const dataToSubmit = initialData 
          ? mockClientFormData // Dados para simular edição
          : { name: 'Novo Cliente de Teste', email: 'novo_cliente@example.com', phone: '123456789' }; // Dados para simular adição
        onSubmit(dataToSubmit); 
    }}>
      <button type="submit">Salvar Cliente (Form Mock)</button>
      <button type="button" onClick={onCancel}>Cancelar (Form Mock)</button>
    </form>
  )),
}));

const mockClients: Client[] = [
  { id: '1', name: 'Alice Silva', email: 'alice@example.com', phone: '111-1111' },
  { id: '2', name: 'Roberto Souza', email: 'roberto@example.com', phone: '222-2222' },
];

describe('PaginaDeClientes', () => {
  beforeEach(() => {
    (getDocs as jest.Mock).mockReset();
    (addDoc as jest.Mock).mockReset().mockResolvedValue({ id: 'novo-cliente-id' });
    (updateDoc as jest.Mock).mockReset().mockResolvedValue(undefined);
    (deleteDoc as jest.Mock).mockReset().mockResolvedValue(undefined);
    (collection as jest.Mock).mockReset().mockImplementation((_db, path) => ({ type: 'collectionRef', path }));
    (doc as jest.Mock).mockReset().mockImplementation((_db, path, id) => ({ type: 'docRef', path, id }));
    mockToast.mockClear();
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  it('renderiza estado de carregamento e depois exibe clientes', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) });
    render(<ClientesPage />);
    expect(screen.getByText(/Carregando clientes.../i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Alice Silva')).toBeInTheDocument();
      expect(screen.getByText('Roberto Souza')).toBeInTheDocument();
    });
  });

  it('exibe estado de vazio se nenhum cliente for encontrado', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] });
    render(<ClientesPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum cliente encontrado/i)).toBeInTheDocument();
    });
  });

  it('abre ClientForm quando o botão "Adicionar Novo Cliente" é clicado', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] });
    render(<ClientesPage />);
    await waitFor(() => expect(screen.queryByTestId('client-form')).not.toBeInTheDocument());
    
    const addButton = screen.getByRole('button', { name: /Adicionar Novo Cliente/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('client-form')).toBeInTheDocument();
    });
  });

  it('adiciona um novo cliente com sucesso', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [] }) 
      .mockResolvedValueOnce({ docs: [{ id: 'novo-cliente-id', data: () => ({ name: 'Novo Cliente de Teste', email: 'novo_cliente@example.com', phone: '123456789' }) }] }); 

    render(<ClientesPage />);
    await screen.findByText(/Nenhum cliente encontrado/i);

    fireEvent.click(screen.getByRole('button', { name: /Adicionar Novo Cliente/i }));
    await screen.findByTestId('client-form');
    
    fireEvent.submit(screen.getByTestId('client-form'));

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledTimes(1);
      expect(addDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'collectionRef', path: 'clients' }), {
        name: 'Novo Cliente de Teste',
        email: 'novo_cliente@example.com',
        phone: '123456789',
      });
      expect(mockToast).toHaveBeenCalledWith({ title: 'Cliente adicionado com sucesso!' });
    });
    await waitFor(() => expect(screen.getByText('Novo Cliente de Teste')).toBeInTheDocument());
  });

  it('edita um cliente existente com sucesso', async () => {
    const editableClient = mockClients[0];
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [{ id: editableClient.id, data: () => editableClient }] }) 
      .mockResolvedValueOnce({ docs: [{ id: editableClient.id, data: () => mockClientFormData }] }); // Após Editar
      
    render(<ClientesPage />);
    await screen.findByText(editableClient.name);

    fireEvent.click(screen.getByTestId(`client-card-${editableClient.id}-edit-button`));

    await screen.findByTestId('client-form'); 
    fireEvent.submit(screen.getByTestId('client-form')); 

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledTimes(1);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'docRef', path: 'clients', id: editableClient.id }), 
        expect.objectContaining(mockClientFormData) // Verifica se foi chamado com os dados mockados para edição
      );
      expect(mockToast).toHaveBeenCalledWith({ title: 'Cliente atualizado com sucesso!' });
    });
     await waitFor(() => expect(screen.getByText(mockClientFormData.name)).toBeInTheDocument());
  });

  it('exclui um cliente com sucesso', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }) 
      .mockResolvedValueOnce({ docs: [mockClients[1]].map(c => ({ id: c.id, data: () => c })) });

    render(<ClientesPage />);
    await screen.findByText(mockClients[0].name);
    
    fireEvent.click(screen.getByTestId(`client-card-${mockClients[0].id}-delete-button`));

    expect(global.confirm).toHaveBeenCalledWith('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.');
    
    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalledTimes(1);
      expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'docRef', path: 'clients', id: mockClients[0].id }));
      expect(mockToast).toHaveBeenCalledWith({ title: 'Cliente excluído com sucesso!' });
    });
    await waitFor(() => expect(screen.queryByText(mockClients[0].name)).not.toBeInTheDocument());
  });

  it('filtra clientes com base no termo de busca', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) });
    render(<ClientesPage />);
    await screen.findByText('Alice Silva');
    await screen.findByText('Roberto Souza');

    const searchInput = screen.getByPlaceholderText(/Buscar cliente por nome, email ou telefone.../i);
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(screen.getByText('Alice Silva')).toBeInTheDocument();
      expect(screen.queryByText('Roberto Souza')).not.toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: 'roberto@example.com' } });
    await waitFor(() => {
      expect(screen.queryByText('Alice Silva')).not.toBeInTheDocument();
      expect(screen.getByText('Roberto Souza')).toBeInTheDocument();
    });
  });
});
