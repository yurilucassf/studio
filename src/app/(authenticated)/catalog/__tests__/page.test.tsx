
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CatalogPage from '../page'; // Adjust path as necessary
import { useToast } from '@/hooks/use-toast';
// We import db here, but its properties will be effectively ignored because
// 'firebase/firestore' functions are mocked to not rely on db's internal methods.
import { db } from '@/lib/firebase';
import type { Book, Client } from '@/lib/types';
// BOOK_GENRES is fine to import here as it's used for mock data generation, not in jest.mock factory
import { BOOK_GENRES } from '@/lib/constants';

// --- Start of New Mocking Strategy ---

// Define mocks for all Firestore SDK functions used in CatalogPage.tsx
const mockGetDocs = jest.fn();
const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockCollection = jest.fn();
const mockOrderBy = jest.fn();
const mockWhere = jest.fn();
const mockQuery = jest.fn();
const mockLimit = jest.fn();
const mockDoc = jest.fn();

const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn(() => Promise.resolve());
const mockWriteBatch = jest.fn(() => ({
  delete: mockBatchDelete,
  commit: mockBatchCommit,
}));

// Mock the 'firebase/firestore' module
jest.mock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  Timestamp: { // Timestamp is a named export from 'firebase/firestore'
    now: jest.fn(() => ({ 
      toDate: () => new Date(),
      toMillis: () => Date.now() 
    })),
    fromMillis: jest.fn(ms => ({ 
      toDate: () => new Date(ms),
      toMillis: () => ms 
    })),
  },
  writeBatch: mockWriteBatch,
  getDocs: mockGetDocs,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  getDoc: mockGetDoc,
  query: mockQuery,
  orderBy: mockOrderBy,
  where: mockWhere,
  limit: mockLimit,
}));

// Mock '@/lib/firebase' to provide a placeholder 'db' and 'auth'
jest.mock('@/lib/firebase', () => ({
  db: { app: {} }, // Placeholder db instance
  auth: jest.fn(),
}));

// --- End of New Mocking Strategy ---


// Mock useToast
jest.mock('@/hooks/use-toast');
const mockToast = jest.fn();
(useToast as jest.Mock).mockReturnValue({ toast: mockToast });

// Mock child components to simplify CatalogPage testing
jest.mock('@/components/catalog/book-card', () => ({
  BookCard: jest.fn(({ book, onEdit, onDelete, onLoanOrReturn }) => (
    <div data-testid={`book-card-${book.id}`}>
      <h3>{book.title}</h3>
      <button onClick={() => onEdit(book)}>Edit</button>
      <button onClick={() => onDelete(book.id)}>Delete</button>
      <button onClick={() => onLoanOrReturn(book, 'loan', 'client1')}>Loan</button>
      <button onClick={() => onLoanOrReturn(book, 'return')}>Return</button>
    </div>
  )),
}));

jest.mock('@/components/catalog/book-form', () => ({
  BookForm: jest.fn(({ onSubmit, onCancel, initialData }) => (
    // Using a hardcoded genre string to avoid out-of-scope variable access for BOOK_GENRES
    <form data-testid="book-form" onSubmit={(e) => { e.preventDefault(); onSubmit(initialData || { title: 'New Test Book', author: 'Test Author', isbn: '1234567890', genre: 'Ficção Científica', publicationYear: 2024, coverImageUrl: '' }); }}>
      <button type="submit">Save Book Form</button>
      <button type="button" onClick={onCancel}>Cancel Book Form</button>
    </form>
  )),
}));

jest.mock('@/components/catalog/book-filters', () => ({
  BookFilters: jest.fn(({ onFiltersChange }) => (
    <div>
      <input data-testid="filter-search" onChange={(e) => onFiltersChange({ searchTerm: e.target.value, genre: '', status: '' })} />
    </div>
  )),
}));

const mockBooks: Book[] = [
  { id: '1', title: 'Book One', author: 'Author A', isbn: '111', genre: BOOK_GENRES[0], publicationYear: 2001, status: 'Disponível', addedDate: Date.now() - 10000, coverImageUrl: `https://placehold.co/300x450.png?text=Book+One` },
  { id: '2', title: 'Book Two', author: 'Author B', isbn: '222', genre: BOOK_GENRES[1], publicationYear: 2002, status: 'Emprestado', borrowedByClientId: 'client1', borrowedByName: 'Client X', borrowedDate: Date.now() - 5000, addedDate: Date.now() - 20000, coverImageUrl: `https://placehold.co/300x450.png?text=Book+Two` },
];
const mockClients: Client[] = [{ id: 'client1', name: 'Client X', email: 'clientx@example.com' }];

describe('CatalogPage', () => {
  beforeEach(() => {
    // Reset all specific Firestore function mocks
    mockGetDocs.mockReset();
    mockAddDoc.mockReset().mockResolvedValue({ id: 'new-doc-id' });
    mockUpdateDoc.mockReset().mockResolvedValue(undefined);
    mockDeleteDoc.mockReset().mockResolvedValue(undefined);
    mockGetDoc.mockReset();
    mockCollection.mockReset();
    mockDoc.mockReset();
    mockQuery.mockReset();
    mockOrderBy.mockReset();
    mockWhere.mockReset();
    mockLimit.mockReset();
    mockWriteBatch.mockReset();
    mockBatchDelete.mockReset();
    mockBatchCommit.mockReset().mockResolvedValue(undefined);
    
    // Configure default implementations for query-related functions to allow chaining
    // The actual db instance is passed as the first argument by the SUT
    mockQuery.mockImplementation((queryObj, ..._constraints) => queryObj); // query(collection(...), where(...))
    mockOrderBy.mockImplementation((_field, _direction) => ({ type: 'orderBy' })); // Returns a constraint
    mockWhere.mockImplementation((_field, _op, _value) => ({ type: 'where' })); // Returns a constraint
    mockLimit.mockImplementation((_count) => ({ type: 'limit' })); // Returns a constraint

    // Configure collection and doc to return identifiable objects for debugging or simple checks if needed
    mockCollection.mockImplementation((_db, path) => ({ type: 'collectionRef', path }));
    mockDoc.mockImplementation((_db, path, id) => ({ type: 'docRef', path, id }));

    // Default mock for writeBatch
    mockWriteBatch.mockReturnValue({
        delete: mockBatchDelete,
        commit: mockBatchCommit,
    });

    mockToast.mockClear();
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  it('renders loading state initially then displays books', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) // Books
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }); // Clients

    render(<CatalogPage />);
    expect(screen.getByText(/Carregando livros.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Book One')).toBeInTheDocument();
      expect(screen.getByText('Book Two')).toBeInTheDocument();
    });
    expect(mockGetDocs).toHaveBeenCalledTimes(2); 
  });

  it('displays empty state if no books are found', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: [] }) // No books
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }); // Clients

    render(<CatalogPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum livro encontrado/i)).toBeInTheDocument();
    });
  });

  it('opens BookForm when "Adicionar Novo Livro" button is clicked', async () => {
     mockGetDocs
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

  it('adds a new book successfully', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: [] }) 
      .mockResolvedValueOnce({ docs: [] }) 
      .mockResolvedValueOnce({ docs: [{ id: 'new-book-id', data: () => ({ title: 'New Test Book', author: 'Test Author', isbn: '1234567890', genre: 'Ficção Científica', publicationYear: 2024, status: 'Disponível', addedDate: { toMillis: () => Date.now() }}) }] }) 
      .mockResolvedValueOnce({ docs: [] }); 


    render(<CatalogPage />);
    await screen.findByText(/Nenhum livro encontrado/i); 

    fireEvent.click(screen.getByRole('button', { name: /Adicionar Novo Livro/i }));
    await screen.findByTestId('book-form');
    
    fireEvent.submit(screen.getByTestId('book-form'));

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
      // db is passed as the first arg to collection(), which is then passed to addDoc()
      expect(mockAddDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'collectionRef', path: 'books' }), expect.objectContaining({
        title: 'New Test Book',
        author: 'Test Author',
        publicationYear: 2024,
        status: 'Disponível',
      }));
      expect(mockToast).toHaveBeenCalledWith({ title: 'Livro adicionado com sucesso!' });
    });
     await waitFor(() => expect(screen.getByText('New Test Book')).toBeInTheDocument());
  });

  it('edits an existing book successfully', async () => {
     const editableBook = { ...mockBooks[0], title: "Editable Book", id: "editable-id" };
     mockGetDocs
      .mockResolvedValueOnce({ docs: [{ id: editableBook.id, data: () => ({...editableBook, addedDate: { toMillis: () => editableBook.addedDate }}) }] })
      .mockResolvedValueOnce({ docs: [] });
      
    render(<CatalogPage />);
    await screen.findByText(editableBook.title);

    const bookCard = screen.getByTestId(`book-card-${editableBook.id}`);
    fireEvent.click(within(bookCard).getByRole('button', { name: 'Edit' })); 

    await screen.findByTestId('book-form'); 
    fireEvent.submit(screen.getByTestId('book-form'));

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      // db is passed as the first arg to doc(), which is then passed to updateDoc()
      expect(mockUpdateDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'docRef', path: 'books', id: editableBook.id }), expect.objectContaining({
        title: editableBook.title, 
        author: editableBook.author,
      }));
      expect(mockToast).toHaveBeenCalledWith({ title: 'Livro atualizado com sucesso!' });
    });
  });

  it('deletes a book successfully', async () => {
    mockGetDocs.mockName('getDocsForBooksInitial');
    mockGetDocs
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) // Initial books
      .mockResolvedValueOnce({ docs: [] }); // Initial clients
    
    // Mock for loan activities query associated with the book to be deleted
    const mockGetDocsForLoanActivities = jest.fn().mockResolvedValue({ docs: [] });
    mockGetDocs.mockImplementationOnce(queryArg => {
        // This is a bit fragile, assumes the loan activities query is the third getDocs call in this test
        // A more robust way would be to inspect queryArg if possible, or use mockName more effectively if jest supports it well for multiple calls with different purposes
        return mockGetDocsForLoanActivities(queryArg);
    });

    // Mock for refreshing book list after deletion
    mockGetDocs.mockResolvedValueOnce({ docs: [mockBooks[1]].map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) });
    // Mock for refreshing clients list (no change)
    mockGetDocs.mockResolvedValueOnce({ docs: [] });


    render(<CatalogPage />);
    await screen.findByText(mockBooks[0].title);
    
    fireEvent.click(within(screen.getByTestId(`book-card-${mockBooks[0].id}`)).getByRole('button', { name: 'Delete' }));

    expect(global.confirm).toHaveBeenCalledWith('Tem certeza que deseja excluir este livro?');
    
    await waitFor(() => {
      expect(mockBatchDelete).toHaveBeenCalledTimes(1); 
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith({ title: 'Livro e histórico de empréstimos excluídos com sucesso!' });
    });
    await waitFor(() => expect(screen.queryByText(mockBooks[0].title)).not.toBeInTheDocument());
  });


  it('loans a book successfully', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) })
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) });
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => mockClients[0] }); 

    render(<CatalogPage />);
    await screen.findByText(mockBooks[0].title); 

    fireEvent.click(within(screen.getByTestId(`book-card-${mockBooks[0].id}`)).getByRole('button', { name: 'Loan' }));
    
    await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalledWith(expect.objectContaining({type: 'docRef', path: 'books', id: mockBooks[0].id}), expect.objectContaining({
            status: 'Emprestado',
            borrowedByClientId: mockClients[0].id,
            borrowedByName: mockClients[0].name,
        }));
        expect(mockAddDoc).toHaveBeenCalledWith(expect.objectContaining({type: 'collectionRef', path: 'loanActivities'}), expect.objectContaining({ 
            bookId: mockBooks[0].id,
            clientId: mockClients[0].id,
            type: 'loan',
        }));
        expect(mockToast).toHaveBeenCalledWith({ title: 'Livro emprestado com sucesso!' });
    });
  });

  it('returns a book successfully', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) })
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) });

    render(<CatalogPage />);
    await screen.findByText(mockBooks[1].title); 

    fireEvent.click(within(screen.getByTestId(`book-card-${mockBooks[1].id}`)).getByRole('button', { name: 'Return' }));

    await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalledWith(expect.objectContaining({type: 'docRef', path: 'books', id: mockBooks[1].id}), expect.objectContaining({
            status: 'Disponível',
            borrowedByClientId: null,
            borrowedByName: null,
        }));
        expect(mockAddDoc).toHaveBeenCalledWith(expect.objectContaining({type: 'collectionRef', path: 'loanActivities'}), expect.objectContaining({ 
            bookId: mockBooks[1].id,
            clientId: mockBooks[1].borrowedByClientId, 
            type: 'return',
        }));
        expect(mockToast).toHaveBeenCalledWith({ title: 'Livro devolvido com sucesso!' });
    });
  });

});

const within = (element: HTMLElement) => ({
  getByRole: (role: string, options?: any) => screen.getByRole(role, { ...options, container: element }),
  getByText: (text: string | RegExp, options?: any) => screen.getByText(text, { ...options, container: element }), 
});

