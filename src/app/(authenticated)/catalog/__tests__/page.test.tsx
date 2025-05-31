
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CatalogPage from '../page';
import { useToast } from '@/hooks/use-toast';
import { BOOK_GENRES } from '@/lib/constants';
import type { Book, Client } from '@/lib/types';

// Mock 'firebase/firestore' module and its functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  Timestamp: { 
    now: jest.fn(() => ({ 
      toDate: () => new Date(),
      toMillis: () => Date.now() 
    })),
    fromMillis: jest.fn(ms => ({ 
      toDate: () => new Date(ms),
      toMillis: () => ms 
    })),
  },
  writeBatch: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDoc: jest.fn(),
  query: jest.fn((queryObj, ..._constraints) => queryObj),
  orderBy: jest.fn(() => ({ type: 'orderBy' })),
  where: jest.fn(() => ({ type: 'where' })),
  limit: jest.fn(() => ({ type: 'limit' })),
}));

// Import the mocked functions so we can configure them
import {
  collection,
  doc,
  writeBatch,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';

// Mock '@/lib/firebase' to provide a placeholder 'db'
jest.mock('@/lib/firebase', () => ({
  db: { app: {} }, // Placeholder db instance
  auth: jest.fn(),
}));

// Mock useToast
jest.mock('@/hooks/use-toast');
const mockToast = jest.fn();
(useToast as jest.Mock).mockReturnValue({ toast: mockToast });

// Mock child components
jest.mock('@/components/catalog/book-card', () => ({
  BookCard: jest.fn(({ book, onEdit, onDelete, onLoanOrReturn, clients }) => (
    <div data-testid={`book-card-${book.id}`}>
      <h3>{book.title}</h3>
      <button data-testid={`book-card-${book.id}-edit-button`} onClick={() => onEdit(book)}>Editar</button>
      <button data-testid={`book-card-${book.id}-delete-button`} onClick={() => onDelete(book.id)}>Excluir</button>
      <button data-testid={`book-card-${book.id}-loan-button`} onClick={() => onLoanOrReturn(book, 'loan', clients[0]?.id || 'client1')}>Emprestar</button>
      <button data-testid={`book-card-${book.id}-return-button`} onClick={() => onLoanOrReturn(book, 'return')}>Devolver</button>
    </div>
  )),
}));

jest.mock('@/components/catalog/book-form', () => ({
  BookForm: jest.fn(({ onSubmit, onCancel, initialData }) => (
    <form data-testid="book-form" onSubmit={(e) => { e.preventDefault(); onSubmit(initialData || { title: 'Novo Livro Mockado', author: 'Autor Mockado', isbn: '0000000000', genre: 'Mock Gênero', publicationYear: 2025, coverImageUrl: '' }); }}>
      <button type="submit">Salvar Livro (Form Mock)</button>
      <button type="button" onClick={onCancel}>Cancelar (Form Mock)</button>
    </form>
  )),
}));

jest.mock('@/components/catalog/book-filters', () => ({
  BookFilters: jest.fn(({ onFiltersChange }) => (
    <div>
      <label htmlFor="filter-search-mock">Filtro:</label>
      <input id="filter-search-mock" data-testid="filter-search" onChange={(e) => onFiltersChange({ searchTerm: e.target.value, genre: '', status: '' })} />
    </div>
  )),
}));

const mockBooks: Book[] = [
  { id: '1', title: 'Livro Um', author: 'Autor A', isbn: '111', genre: BOOK_GENRES[0], publicationYear: 2001, status: 'Disponível', addedDate: Date.now() - 10000, coverImageUrl: `https://placehold.co/300x450.png` },
  { id: '2', title: 'Livro Dois', author: 'Autor B', isbn: '222', genre: BOOK_GENRES[1], publicationYear: 2002, status: 'Emprestado', borrowedByClientId: 'client1', borrowedByName: 'Cliente X', borrowedDate: Date.now() - 5000, addedDate: Date.now() - 20000, coverImageUrl: `https://placehold.co/300x450.png` },
];
const mockClients: Client[] = [{ id: 'client1', name: 'Cliente X', email: 'clientex@example.com' }];

let batchDeleteMock: jest.Mock;
let batchCommitMock: jest.Mock;

describe('CatalogPage', () => {
  beforeEach(() => {
    (getDocs as jest.Mock).mockReset();
    (addDoc as jest.Mock).mockReset().mockResolvedValue({ id: 'new-doc-id' });
    (updateDoc as jest.Mock).mockReset().mockResolvedValue(undefined);
    (deleteDoc as jest.Mock).mockReset().mockResolvedValue(undefined);
    (getDoc as jest.Mock).mockReset();
    (collection as jest.Mock).mockReset().mockImplementation((_db, path) => ({ type: 'collectionRef', path }));
    (doc as jest.Mock).mockReset().mockImplementation((_db, path, id) => ({ type: 'docRef', path, id }));
    
    batchDeleteMock = jest.fn();
    batchCommitMock = jest.fn().mockResolvedValue(undefined);
    (writeBatch as jest.Mock).mockReset().mockReturnValue({
        delete: batchDeleteMock,
        commit: batchCommitMock,
    });
    
    mockToast.mockClear();
    (global.confirm as jest.Mock).mockReturnValue(true); // Auto-confirma diálogos de confirmação
  });

  it('renderiza estado de carregamento inicialmente e depois exibe os livros', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) // Livros
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }); // Clientes

    render(<CatalogPage />);
    expect(screen.getByText(/Carregando livros.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Livro Um')).toBeInTheDocument();
      expect(screen.getByText('Livro Dois')).toBeInTheDocument();
    });
    expect(getDocs).toHaveBeenCalledTimes(2); 
  });

  it('exibe estado de vazio se nenhum livro for encontrado', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [] }) // Sem livros
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }); // Clientes

    render(<CatalogPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum livro encontrado/i)).toBeInTheDocument();
    });
  });

  it('abre BookForm quando o botão "Adicionar Novo Livro" é clicado', async () => {
     (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [] }) 
      .mockResolvedValueOnce({ docs: [] }); 

    render(<CatalogPage />);
    await waitFor(() => expect(screen.queryByTestId('book-form')).not.toBeInTheDocument());
    
    const addButton = screen.getByRole('button', { name: /Adicionar Novo Livro/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('book-form')).toBeInTheDocument();
    });
  });

  it('adiciona um novo livro com sucesso', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [] }) // Livros iniciais
      .mockResolvedValueOnce({ docs: [] }) // Clientes iniciais
      .mockResolvedValueOnce({ docs: [{ id: 'novo-livro-id', data: () => ({ title: 'Novo Livro Mockado', author: 'Autor Mockado', isbn: '0000000000', genre: 'Mock Gênero', publicationYear: 2025, status: 'Disponível', addedDate: { toMillis: () => Date.now() }}) }] }) // Para buscar livros após adicionar novo
      .mockResolvedValueOnce({ docs: [] }); // Para buscar clientes após adicionar (sem mudança esperada)

    render(<CatalogPage />);
    await screen.findByText(/Nenhum livro encontrado/i); 

    fireEvent.click(screen.getByRole('button', { name: /Adicionar Novo Livro/i }));
    await screen.findByTestId('book-form');
    
    fireEvent.submit(screen.getByTestId('book-form')); // Usa o mock do BookForm

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledTimes(1);
      expect(addDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'collectionRef', path: 'books' }), expect.objectContaining({
        title: 'Novo Livro Mockado', // Vem do mock do BookForm
        status: 'Disponível',
      }));
      expect(mockToast).toHaveBeenCalledWith({ title: 'Livro adicionado com sucesso!' });
    });
     await waitFor(() => expect(screen.getByText('Novo Livro Mockado')).toBeInTheDocument());
  });

  it('edita um livro existente com sucesso', async () => {
     const editableBook = { ...mockBooks[0], title: "Livro Editável", id: "id-editavel" };
     (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [{ id: editableBook.id, data: () => ({...editableBook, addedDate: { toMillis: () => editableBook.addedDate }}) }] }) // Livros
      .mockResolvedValueOnce({ docs: [] }) // Clientes
      .mockResolvedValueOnce({ docs: [{ id: editableBook.id, data: () => ({...editableBook, title: 'Novo Livro Mockado', addedDate: { toMillis: () => editableBook.addedDate }}) }] }) // Após editar
      .mockResolvedValueOnce({ docs: [] });
      
    render(<CatalogPage />);
    await screen.findByText(editableBook.title);

    fireEvent.click(screen.getByTestId(`book-card-${editableBook.id}-edit-button`)); 

    await screen.findByTestId('book-form'); 
    fireEvent.submit(screen.getByTestId('book-form')); // Usa o mock do BookForm

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledTimes(1);
      expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'docRef', path: 'books', id: editableBook.id }), expect.objectContaining({
        title: 'Novo Livro Mockado', // Vem do mock do BookForm
      }));
      expect(mockToast).toHaveBeenCalledWith({ title: 'Livro atualizado com sucesso!' });
    });
  });

  it('exclui um livro com sucesso', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) // Livros Iniciais
      .mockResolvedValueOnce({ docs: [] }) // Clientes Iniciais
      .mockResolvedValueOnce({ docs: [] }) // Mock para query de loanActivities associada ao livro a ser excluído
      .mockResolvedValueOnce({ docs: [mockBooks[1]].map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) // Mock para atualizar lista de livros após exclusão
      .mockResolvedValueOnce({ docs: [] }); // Mock para atualizar lista de clientes (sem alteração)

    render(<CatalogPage />);
    await screen.findByText(mockBooks[0].title);
    
    fireEvent.click(screen.getByTestId(`book-card-${mockBooks[0].id}-delete-button`));

    expect(global.confirm).toHaveBeenCalledWith('Tem certeza que deseja excluir este livro?');
    
    await waitFor(() => {
      expect(batchDeleteMock).toHaveBeenCalledTimes(1); 
      expect(batchCommitMock).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith({ title: 'Livro e histórico de empréstimos excluídos com sucesso!' });
    });
    await waitFor(() => expect(screen.queryByText(mockBooks[0].title)).not.toBeInTheDocument());
  });

  it('empresta um livro com sucesso', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) // Livros
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }) // Clientes
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, status: b.id === mockBooks[0].id ? 'Emprestado' : b.status, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) // Após emprestar (Livros)
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }); // Após emprestar (Clientes)

    (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => mockClients[0] }); 

    render(<CatalogPage />);
    await screen.findByText(mockBooks[0].title); 

    fireEvent.click(screen.getByTestId(`book-card-${mockBooks[0].id}-loan-button`));
    
    await waitFor(() => {
        expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({type: 'docRef', path: 'books', id: mockBooks[0].id}), expect.objectContaining({
            status: 'Emprestado',
            borrowedByClientId: mockClients[0].id,
            borrowedByName: mockClients[0].name,
        }));
        expect(addDoc).toHaveBeenCalledWith(expect.objectContaining({type: 'collectionRef', path: 'loanActivities'}), expect.objectContaining({ 
            bookId: mockBooks[0].id,
            clientId: mockClients[0].id,
            type: 'loan',
        }));
        expect(mockToast).toHaveBeenCalledWith({ title: 'Livro emprestado com sucesso!' });
    });
  });

  it('devolve um livro com sucesso', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) // Livros
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }) // Clientes
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, status: b.id === mockBooks[1].id ? 'Disponível' : b.status, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) // Após devolver (Livros)
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }); // Após devolver (Clientes)

    render(<CatalogPage />);
    await screen.findByText(mockBooks[1].title); 

    fireEvent.click(screen.getByTestId(`book-card-${mockBooks[1].id}-return-button`));

    await waitFor(() => {
        expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({type: 'docRef', path: 'books', id: mockBooks[1].id}), expect.objectContaining({
            status: 'Disponível',
            borrowedByClientId: null,
            borrowedByName: null,
        }));
        expect(addDoc).toHaveBeenCalledWith(expect.objectContaining({type: 'collectionRef', path: 'loanActivities'}), expect.objectContaining({ 
            bookId: mockBooks[1].id,
            clientId: mockBooks[1].borrowedByClientId, 
            type: 'return',
        }));
        expect(mockToast).toHaveBeenCalledWith({ title: 'Livro devolvido com sucesso!' });
    });
  });
});
