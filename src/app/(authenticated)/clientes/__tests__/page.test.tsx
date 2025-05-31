
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
  // Timestamp needed if your component uses it directly, but usually comes from server data
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

// Import the mocked functions for configuration
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

// Mock '@/lib/firebase'
jest.mock('@/lib/firebase', () => ({
  db: { app: {} }, // Placeholder db
}));

// Mock hooks
jest.mock('@/hooks/use-toast');
const mockToast = jest.fn();
(require('@/hooks/use-toast') as any).useToast = () => ({ toast: mockToast });

// Mock child components
jest.mock('@/components/clientes/client-card', () => ({
  ClientCard: jest.fn(({ client, onEdit, onDelete }) => (
    <div data-testid={`client-card-${client.id}`}>
      <h4>{client.name}</h4>
      <button onClick={() => onEdit(client)}>Edit</button>
      <button onClick={() => onDelete(client.id)}>Delete</button>
    </div>
  )),
}));

jest.mock('@/components/clientes/client-form', () => ({
  ClientForm: jest.fn(({ onSubmit, onCancel, initialData }) => (
    <form data-testid="client-form" onSubmit={(e) => { e.preventDefault(); onSubmit(initialData || { name: 'New Test Client', email: 'new@example.com' }); }}>
      <button type="submit">Save Client Form</button>
      <button type="button" onClick={onCancel}>Cancel Client Form</button>
    </form>
  )),
}));

const mockClients: Client[] = [
  { id: '1', name: 'Alice Wonderland', email: 'alice@example.com', phone: '111-1111' },
  { id: '2', name: 'Bob The Builder', email: 'bob@example.com', phone: '222-2222' },
];

describe('ClientesPage', () => {
  beforeEach(() => {
    (getDocs as jest.Mock).mockReset();
    (addDoc as jest.Mock).mockReset().mockResolvedValue({ id: 'new-client-id' });
    (updateDoc as jest.Mock).mockReset().mockResolvedValue(undefined);
    (deleteDoc as jest.Mock).mockReset().mockResolvedValue(undefined);
    (collection as jest.Mock).mockReset().mockImplementation((_db, path) => ({ type: 'collectionRef', path }));
    (doc as jest.Mock).mockReset().mockImplementation((_db, path, id) => ({ type: 'docRef', path, id }));
    mockToast.mockClear();
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  it('renders loading state initially then displays clients', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) });

    render(<ClientesPage />);
    expect(screen.getByText(/Carregando clientes.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Alice Wonderland')).toBeInTheDocument();
      expect(screen.getByText('Bob The Builder')).toBeInTheDocument();
    });
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it('displays empty state if no clients are found', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] }); // No clients

    render(<ClientesPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum cliente encontrado/i)).toBeInTheDocument();
    });
  });

  it('opens ClientForm when "Adicionar Novo Cliente" button is clicked', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] });

    render(<ClientesPage />);
    await waitFor(() => expect(screen.queryByTestId('client-form')).not.toBeInTheDocument());
    
    const addButton = screen.getByRole('button', { name: /Adicionar Novo Cliente/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('client-form')).toBeInTheDocument();
    });
  });

  it('adds a new client successfully', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [] }) // Initial load
      .mockResolvedValueOnce({ docs: [{ id: 'new-client-id', data: () => ({ name: 'New Test Client', email: 'new@example.com' }) }] }); // After adding

    render(<ClientesPage />);
    await screen.findByText(/Nenhum cliente encontrado/i);

    fireEvent.click(screen.getByRole('button', { name: /Adicionar Novo Cliente/i }));
    await screen.findByTestId('client-form');
    
    fireEvent.submit(screen.getByTestId('client-form'));

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledTimes(1);
      expect(addDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'collectionRef', path: 'clients' }), {
        name: 'New Test Client',
        email: 'new@example.com',
      });
      expect(mockToast).toHaveBeenCalledWith({ title: 'Cliente adicionado com sucesso!' });
    });
    await waitFor(() => expect(screen.getByText('New Test Client')).toBeInTheDocument());
  });

  it('edits an existing client successfully', async () => {
    const editableClient = mockClients[0];
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [{ id: editableClient.id, data: () => editableClient }] });
      
    render(<ClientesPage />);
    await screen.findByText(editableClient.name);

    const clientCard = screen.getByTestId(`client-card-${editableClient.id}`);
    fireEvent.click(clientCard.querySelector('button[aria-label="Editar"], button:not([aria-label="Excluir"])')!); // Simplified selector for edit

    await screen.findByTestId('client-form'); 
    fireEvent.submit(screen.getByTestId('client-form')); // Assumes form submit uses initialData passed to it

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledTimes(1);
      // In this mock, BookForm submits its initialData if present, so check for that
      expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'docRef', path: 'clients', id: editableClient.id }), 
        expect.objectContaining({ name: editableClient.name, email: editableClient.email })
      );
      expect(mockToast).toHaveBeenCalledWith({ title: 'Cliente atualizado com sucesso!' });
    });
  });

  it('deletes a client successfully', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }) // Initial load
      .mockResolvedValueOnce({ docs: [mockClients[1]].map(c => ({ id: c.id, data: () => c })) }); // After delete

    render(<ClientesPage />);
    await screen.findByText(mockClients[0].name);
    
    const clientCard = screen.getByTestId(`client-card-${mockClients[0].id}`);
    // The delete button is inside an AlertDialog, so we need to trigger that first
    // For simplicity, we assume the ClientCard mock calls onDelete directly when its delete button is clicked
    fireEvent.click(clientCard.querySelectorAll('button')[1]); // Assuming delete is the second button in the mock

    expect(global.confirm).toHaveBeenCalledWith('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.');
    
    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalledTimes(1);
      expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'docRef', path: 'clients', id: mockClients[0].id }));
      expect(mockToast).toHaveBeenCalledWith({ title: 'Cliente excluído com sucesso!' });
    });
    await waitFor(() => expect(screen.queryByText(mockClients[0].name)).not.toBeInTheDocument());
  });

  it('filters clients based on search term', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) });
    render(<ClientesPage />);
    await screen.findByText('Alice Wonderland');
    await screen.findByText('Bob The Builder');

    const searchInput = screen.getByPlaceholderText(/Buscar cliente por nome, email ou telefone.../i);
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(screen.getByText('Alice Wonderland')).toBeInTheDocument();
      expect(screen.queryByText('Bob The Builder')).not.toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: 'bob@example.com' } });
    await waitFor(() => {
      expect(screen.queryByText('Alice Wonderland')).not.toBeInTheDocument();
      expect(screen.getByText('Bob The Builder')).toBeInTheDocument();
    });
  });
});

    