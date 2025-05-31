
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CatalogPage from '../page'; // Adjust path as necessary
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase'; // We'll mock its methods
import type { Book, Client } from '@/lib/types';
import { BOOK_GENRES } from '@/lib/constants';

// Mock Firebase Firestore
jest.mock('@/lib/firebase', () => ({
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
    Timestamp: {
      now: jest.fn(() => ({ toMillis: () => Date.now() })),
      fromMillis: jest.fn(ms => ({ toMillis: () => ms })),
    },
    // Add writeBatch mock here
    writeBatch: jest.fn(() => ({
      delete: jest.fn(),
      commit: jest.fn(() => Promise.resolve()),
    })),
  },
  // Keep auth if needed by other parts, or mock it as well
  auth: jest.fn(),
}));

const mockGetDocs = jest.fn();
const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockWriteBatchInstance = {
  delete: jest.fn(),
  commit: jest.fn(() => Promise.resolve()),
};

(db.collection as jest.Mock).mockImplementation((path: string) => {
  if (path === 'loanActivities' && (mockGetDocs as jest.Mock).getMockName() === 'getDocsForLoanActivities') {
     return { getDocs: mockGetDocs, addDoc: mockAddDoc };
  }
  if (path === 'loanActivities') {
    return { addDoc: mockAddDoc }; // Simplified for loan activities when not specifically querying them
  }
  return {
    getDocs: mockGetDocs,
    addDoc: mockAddDoc,
    orderBy: jest.fn().mockReturnThis(), // Allows chaining like query(collection(...), orderBy(...))
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };
});

(db.doc as jest.Mock).mockImplementation(() => ({
  update: mockUpdateDoc,
  delete: mockDeleteDoc,
  get: mockGetDoc,
}));

// Ensure db.writeBatch returns the mock instance
(db.writeBatch as jest.Mock).mockReturnValue(mockWriteBatchInstance);


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
  { id: '1', title: 'Book One', author: 'Author A', isbn: '111', genre: BOOK_GENRES[0], publicationYear: 2001, status: 'Disponível', addedDate: Date.now() - 10000, coverImageUrl: `https://placehold.co/300x450.png?text=Book+One` },
  { id: '2', title: 'Book Two', author: 'Author B', isbn: '222', genre: BOOK_GENRES[1], publicationYear: 2002, status: 'Emprestado', borrowedByClientId: 'client1', borrowedByName: 'Client X', borrowedDate: Date.now() - 5000, addedDate: Date.now() - 20000, coverImageUrl: `https://placehold.co/300x450.png?text=Book+Two` },
];
const mockClients: Client[] = [{ id: 'client1', name: 'Client X', email: 'clientx@example.com' }];

describe('CatalogPage', () => {
  beforeEach(() => {
    // Reset all mock implementations and call counts
    mockGetDocs.mockReset();
    mockAddDoc.mockReset().mockResolvedValue({ id: 'new-doc-id' });
    mockUpdateDoc.mockReset().mockResolvedValue(undefined);
    mockDeleteDoc.mockReset().mockResolvedValue(undefined);
    mockGetDoc.mockReset();
    (db.collection as jest.Mock).mockClear();
    (db.doc as jest.Mock).mockClear();
    (db.writeBatch as jest.Mock).mockClear(); // Clear writeBatch mock
    mockWriteBatchInstance.delete.mockClear(); // Clear calls on the instance
    mockWriteBatchInstance.commit.mockClear(); // Clear calls on the instance
     mockToast.mockClear();
     (global.confirm as jest.Mock).mockReturnValue(true); // Default to "yes" for confirm dialogs
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
    expect(mockGetDocs).toHaveBeenCalledTimes(2); // Once for books, once for clients
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
      .mockResolvedValueOnce({ docs: [] }) // Initial load: no books
      .mockResolvedValueOnce({ docs: [] }) // Initial load: no clients
      .mockResolvedValueOnce({ docs: [{ id: 'new-book-id', data: () => ({ title: 'New Test Book', author: 'Test Author', isbn: '1234567890', genre: 'Ficção Científica', publicationYear: 2024, status: 'Disponível', addedDate: { toMillis: () => Date.now() }}) }] }) // After add: new book
      .mockResolvedValueOnce({ docs: [] }); // After add: clients (no change)


    render(<CatalogPage />);
    await screen.findByText(/Nenhum livro encontrado/i); // Ensure initial load is done

    fireEvent.click(screen.getByRole('button', { name: /Adicionar Novo Livro/i }));
    await screen.findByTestId('book-form');
    
    // Simulate form submission (BookForm mock calls onSubmit directly)
    fireEvent.submit(screen.getByTestId('book-form'));

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
      expect(mockAddDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        title: 'New Test Book', // From BookForm mock
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

    // In BookCard mock, the edit button directly calls onEdit with the book
    // So we need to find the button inside the mocked BookCard and click it
    const bookCard = screen.getByTestId(`book-card-${editableBook.id}`);
    fireEvent.click(within(bookCard).getByRole('button', { name: 'Edit' })); // From BookCard mock

    await screen.findByTestId('book-form'); // Form should be open with initialData

    // Simulate form submission (BookForm mock calls onSubmit with initialData if not changed, or new data)
    // Let's assume BookForm mock will submit the `initialData` provided to it (which is `editableBook`)
    // or a modified version if the mock was more complex.
    // For this test, the mock `BookForm`'s submit will use its default "New Test Book" or initialData.
    // To test edit properly, the BookForm mock's onSubmit should use `initialData` passed to it.
    // Let's adjust the mock slightly for the test's sake (or make it more sophisticated)
    // For now, we'll rely on the fact that `handleFormSubmit` in CatalogPage receives the data.

    // We'll simulate submitting the form which will call `handleFormSubmit` with `editingBook` data
    // The BookForm mock will pass its `initialData` when submitted.
    fireEvent.submit(screen.getByTestId('book-form'));

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        title: editableBook.title, // From the data passed to BookForm's onSubmit
        author: editableBook.author,
      }));
      expect(mockToast).toHaveBeenCalledWith({ title: 'Livro atualizado com sucesso!' });
    });
  });

  it('deletes a book successfully', async () => {
    // First getDocs for initial book load
    mockGetDocs.mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) });
    // Second getDocs for initial client load
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    // Third getDocs for querying loan activities for the book to be deleted
    mockGetDocs.mockName('getDocsForLoanActivities').mockResolvedValueOnce({ docs: [] }); // No loan activities for this book
    // Fourth getDocs for refreshing books list after deletion
    mockGetDocs.mockResolvedValueOnce({ docs: [mockBooks[1]].map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) });
    // Fifth getDocs for refreshing clients list after deletion (no change expected)
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    render(<CatalogPage />);
    await screen.findByText(mockBooks[0].title);
    
    fireEvent.click(within(screen.getByTestId(`book-card-${mockBooks[0].id}`)).getByRole('button', { name: 'Delete' }));

    expect(global.confirm).toHaveBeenCalledWith('Tem certeza que deseja excluir este livro?');
    
    await waitFor(() => {
      expect(mockWriteBatchInstance.delete).toHaveBeenCalledTimes(1); // bookRef
      // Potentially 1 more if loan activities existed for mockBooks[0].id, current mock is 0
      expect(mockWriteBatchInstance.commit).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith({ title: 'Livro e histórico de empréstimos excluídos com sucesso!' });
    });
    await waitFor(() => expect(screen.queryByText(mockBooks[0].title)).not.toBeInTheDocument());
  });


  it('loans a book successfully', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) })
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) });
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => mockClients[0] }); // For client lookup

    render(<CatalogPage />);
    await screen.findByText(mockBooks[0].title); // Book One is 'Disponível'

    // Simulate loan action from BookCard mock
    fireEvent.click(within(screen.getByTestId(`book-card-${mockBooks[0].id}`)).getByRole('button', { name: 'Loan' }));
    
    await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            status: 'Emprestado',
            borrowedByClientId: mockClients[0].id,
            borrowedByName: mockClients[0].name,
        }));
        expect(mockAddDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ // For loanActivities
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
    await screen.findByText(mockBooks[1].title); // Book Two is 'Emprestado'

    // Simulate return action from BookCard mock
    fireEvent.click(within(screen.getByTestId(`book-card-${mockBooks[1].id}`)).getByRole('button', { name: 'Return' }));

    await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            status: 'Disponível',
            borrowedByClientId: null,
            borrowedByName: null,
        }));
        expect(mockAddDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ // For loanActivities
            bookId: mockBooks[1].id,
            clientId: mockBooks[1].borrowedByClientId, 
            type: 'return',
        }));
        expect(mockToast).toHaveBeenCalledWith({ title: 'Livro devolvido com sucesso!' });
    });
  });

});

// Helper to access elements within a specific scope
const within = (element: HTMLElement) => ({
  getByRole: (role: string, options?: any) => screen.getByRole(role, { ...options, container: element }),
  getByText: (text: string | RegExp, options?: any) => screen.getByText(text, { ...options, container: element }), // Added RegExp support
  // Add other queries as needed
});

