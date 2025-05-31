
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CatalogPage from '../page'; // Adjust path as necessary
import { useToast } from '@/hooks/use-toast';
// db from @/lib/firebase is imported by SUT, its mock is handled by jest.mock('@/lib/firebase')
// BOOK_GENRES is fine to import here as it's used for mock data generation
import { BOOK_GENRES } from '@/lib/constants';
import type { Book, Client } from '@/lib/types';

// --- Start of New Mocking Strategy ---

// Mock 'firebase/firestore' module and its functions
// The factory function returns an object where each key is a Firestore function name,
// and its value is a jest.fn() mock.
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
  writeBatch: jest.fn(() => ({ // writeBatch itself returns an object with mockable methods
      delete: jest.fn(), // This inner delete will be a fresh mock instance each time writeBatch is called
      commit: jest.fn(() => Promise.resolve()), // Same for commit
  })),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDoc: jest.fn(),
  query: jest.fn((queryObj, ..._constraints) => queryObj), // For chaining, returns the first arg
  orderBy: jest.fn(() => ({ type: 'orderBy' })),          // Returns a simple object for constraint
  where: jest.fn(() => ({ type: 'where' })),              // Returns a simple object for constraint
  limit: jest.fn(() => ({ type: 'limit' })),              // Returns a simple object for constraint
}));

// Import the mocked functions so we can configure them in `beforeEach`
// These will be Jest mock functions due to the jest.mock call above.
import {
  collection,
  doc,
  // Timestamp, // Usually not directly configured, but its mock is used by SUT
  writeBatch,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  // query, orderBy, where, limit // Not typically configured directly in these tests, but available if needed
} from 'firebase/firestore';


// Mock '@/lib/firebase' to provide a placeholder 'db' and 'auth'
jest.mock('@/lib/firebase', () => ({
  db: { app: {} }, // Placeholder db instance, SUT passes this to Firestore functions
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
  { id: '1', title: 'Book One', author: 'Author A', isbn: '111', genre: BOOK_GENRES[0], publicationYear: 2001, status: 'Disponível', addedDate: Date.now() - 10000, coverImageUrl: `https://placehold.co/300x450.png` },
  { id: '2', title: 'Book Two', author: 'Author B', isbn: '222', genre: BOOK_GENRES[1], publicationYear: 2002, status: 'Emprestado', borrowedByClientId: 'client1', borrowedByName: 'Client X', borrowedDate: Date.now() - 5000, addedDate: Date.now() - 20000, coverImageUrl: `https://placehold.co/300x450.png` },
];
const mockClients: Client[] = [{ id: 'client1', name: 'Client X', email: 'clientx@example.com' }];

// Mocks for writeBatch's inner methods, to be re-assigned in beforeEach
let batchDeleteMock: jest.Mock;
let batchCommitMock: jest.Mock;

describe('CatalogPage', () => {
  beforeEach(() => {
    // Reset and configure the imported mocks
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
    (global.confirm as jest.Mock).mockReturnValue(true);
  });

  it('renders loading state initially then displays books', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) // Books
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }); // Clients

    render(<CatalogPage />);
    expect(screen.getByText(/Carregando livros.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Book One')).toBeInTheDocument();
      expect(screen.getByText('Book Two')).toBeInTheDocument();
    });
    expect(getDocs).toHaveBeenCalledTimes(2); 
  });

  it('displays empty state if no books are found', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [] }) // No books
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }); // Clients

    render(<CatalogPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum livro encontrado/i)).toBeInTheDocument();
    });
  });

  it('opens BookForm when "Adicionar Novo Livro" button is clicked', async () => {
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

  it('adds a new book successfully', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [] }) // Initial books
      .mockResolvedValueOnce({ docs: [] }) // Initial clients
      // For fetching books after adding new one
      .mockResolvedValueOnce({ docs: [{ id: 'new-book-id', data: () => ({ title: 'New Test Book', author: 'Test Author', isbn: '1234567890', genre: 'Ficção Científica', publicationYear: 2024, status: 'Disponível', addedDate: { toMillis: () => Date.now() }}) }] }) 
      .mockResolvedValueOnce({ docs: [] }); // For fetching clients after adding new book (no change expected)


    render(<CatalogPage />);
    await screen.findByText(/Nenhum livro encontrado/i); 

    fireEvent.click(screen.getByRole('button', { name: /Adicionar Novo Livro/i }));
    await screen.findByTestId('book-form');
    
    fireEvent.submit(screen.getByTestId('book-form'));

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledTimes(1);
      expect(addDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'collectionRef', path: 'books' }), expect.objectContaining({
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
     (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [{ id: editableBook.id, data: () => ({...editableBook, addedDate: { toMillis: () => editableBook.addedDate }}) }] })
      .mockResolvedValueOnce({ docs: [] });
      
    render(<CatalogPage />);
    await screen.findByText(editableBook.title);

    const bookCard = screen.getByTestId(`book-card-${editableBook.id}`);
    fireEvent.click(within(bookCard).getByRole('button', { name: 'Edit' })); 

    await screen.findByTestId('book-form'); 
    fireEvent.submit(screen.getByTestId('book-form'));

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledTimes(1);
      expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ type: 'docRef', path: 'books', id: editableBook.id }), expect.objectContaining({
        title: editableBook.title, 
        author: editableBook.author,
      }));
      expect(mockToast).toHaveBeenCalledWith({ title: 'Livro atualizado com sucesso!' });
    });
  });

  it('deletes a book successfully', async () => {
    (getDocs as jest.Mock).mockName('getDocsForBooksInitial');
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) // Initial books
      .mockResolvedValueOnce({ docs: [] }); // Initial clients
    
    // Mock for loan activities query associated with the book to be deleted
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] }); // Assuming the third call to getDocs is for loanActivities

    // Mock for refreshing book list after deletion
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [mockBooks[1]].map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) });
    // Mock for refreshing clients list (no change)
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] });


    render(<CatalogPage />);
    await screen.findByText(mockBooks[0].title);
    
    fireEvent.click(within(screen.getByTestId(`book-card-${mockBooks[0].id}`)).getByRole('button', { name: 'Delete' }));

    expect(global.confirm).toHaveBeenCalledWith('Tem certeza que deseja excluir este livro?');
    
    await waitFor(() => {
      expect(batchDeleteMock).toHaveBeenCalledTimes(1); 
      expect(batchCommitMock).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith({ title: 'Livro e histórico de empréstimos excluídos com sucesso!' });
    });
    await waitFor(() => expect(screen.queryByText(mockBooks[0].title)).not.toBeInTheDocument());
  });


  it('loans a book successfully', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) })
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) });
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => mockClients[0] }); 

    render(<CatalogPage />);
    await screen.findByText(mockBooks[0].title); 

    fireEvent.click(within(screen.getByTestId(`book-card-${mockBooks[0].id}`)).getByRole('button', { name: 'Loan' }));
    
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

  it('returns a book successfully', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) })
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) });

    render(<CatalogPage />);
    await screen.findByText(mockBooks[1].title); 

    fireEvent.click(within(screen.getByTestId(`book-card-${mockBooks[1].id}`)).getByRole('button', { name: 'Return' }));

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

// Helper to scope queries within a specific element
const within = (element: HTMLElement) => ({
  getByRole: (role: string, options?: any) => screen.getByRole(role, { ...options, container: element }),
  getByText: (text: string | RegExp, options?: any) => screen.getByText(text, { ...options, container: element }), 
  // Add other queries as needed, e.g., getByLabelText
});

