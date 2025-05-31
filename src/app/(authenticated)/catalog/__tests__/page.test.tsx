import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CatalogPage from '../page';
import { useToast } from '@/hooks/use-toast';
import { BOOK_GENRES } from '@/lib/constants';
import type { Book, Client } from '@/lib/types';

// Funções mock de Firestore
const mockGetDocs = jest.fn();
const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockQuery = jest.fn((queryObj, ..._constraints) => queryObj); // Retorna o próprio objeto de query para encadeamento
const mockOrderBy = jest.fn(() => ({ type: 'orderBy' })); // Retorna um objeto simples para representar a constraint
const mockWhere = jest.fn(() => ({ type: 'where' }));
const mockLimit = jest.fn(() => ({ type: 'limit' }));
const mockCollection = jest.fn();
const mockDoc = jest.fn();

let batchDeleteMock = jest.fn();
let batchCommitMock = jest.fn().mockResolvedValue(undefined);
const mockWriteBatch = jest.fn(() => ({
  delete: batchDeleteMock,
  commit: batchCommitMock,
}));

const mockTimestampNow = jest.fn(() => ({ 
  toDate: () => new Date(),
  toMillis: () => Date.now() 
}));
const mockTimestampFromMillis = jest.fn(ms => ({ 
  toDate: () => new Date(ms),
  toMillis: () => ms 
}));

// Mock do módulo 'firebase/firestore'
jest.mock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  Timestamp: { 
    now: mockTimestampNow,
    fromMillis: mockTimestampFromMillis,
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

// Mock do módulo '@lib/firebase'
jest.mock('@/lib/firebase', () => ({
  db: { app: {} }, // Mock simples do objeto db, já que as funções vêm de 'firebase/firestore'
  auth: jest.fn(),
}));

jest.mock('@/hooks/use-toast');
const mockToast = jest.fn();
(useToast as jest.Mock).mockReturnValue({ toast: mockToast });

const mockEditedBookFormData = {
  title: 'Livro Mockado Editado',
  author: 'Autor Mockado Editado',
  isbn: '0000000001', 
  genre: BOOK_GENRES[2], 
  publicationYear: 2025,
  coverImageUrl: 'http://example.com/edited.jpg'
};

const mockNewBookFormData = {
  title: 'Novo Livro Mockado Adicionado',
  author: 'Autor Mockado Adicionado',
  isbn: '1112223334', 
  genre: BOOK_GENRES[0],
  publicationYear: 2024,
  coverImageUrl: '' // O formulário mockado enviará string vazia se não preenchido
};


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
    <form data-testid="book-form" onSubmit={(e) => { 
        e.preventDefault(); 
        const dataToSubmit = initialData ? mockEditedBookFormData : mockNewBookFormData;
        onSubmit(dataToSubmit); 
    }}>
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
  { id: '1', title: 'Livro Um', author: 'Autor A', isbn: '1111111111', genre: BOOK_GENRES[0], publicationYear: 2001, status: 'Disponível', addedDate: Date.now() - 10000, coverImageUrl: `https://placehold.co/300x450.png` },
  { id: '2', title: 'Livro Dois', author: 'Autor B', isbn: '2222222222', genre: BOOK_GENRES[1], publicationYear: 2002, status: 'Emprestado', borrowedByClientId: 'client1', borrowedByName: 'Cliente X', borrowedDate: Date.now() - 5000, addedDate: Date.now() - 20000, coverImageUrl: `https://placehold.co/300x450.png` },
];
const mockClients: Client[] = [{ id: 'client1', name: 'Cliente X', email: 'clientex@example.com' }];


describe('PaginaDeCatalogo', () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockAddDoc.mockReset().mockResolvedValue({ id: 'new-doc-id' });
    mockUpdateDoc.mockReset().mockResolvedValue(undefined);
    mockDeleteDoc.mockReset().mockResolvedValue(undefined);
    mockGetDoc.mockReset();
    mockCollection.mockReset().mockImplementation((_db, path) => ({ type: 'collectionRef', path }));
    mockDoc.mockReset().mockImplementation((_db, path, id) => ({ type: 'docRef', path, id }));
    
    batchDeleteMock.mockReset();
    batchCommitMock.mockReset().mockResolvedValue(undefined);
    mockWriteBatch.mockClear().mockReturnValue({ // Garante que writeBatch() retorne o objeto mockado
        delete: batchDeleteMock,
        commit: batchCommitMock,
    });
    
    mockToast.mockClear();
    (global.confirm as jest.Mock).mockReturnValue(true); 
  });

  it('renderiza estado de carregamento inicialmente e depois exibe os livros', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) 
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }); 

    render(<CatalogPage />);
    expect(screen.getByText(/Carregando livros.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Livro Um')).toBeInTheDocument();
      expect(screen.getByText('Livro Dois')).toBeInTheDocument();
    });
    expect(mockGetDocs).toHaveBeenCalledTimes(2); 
  });

  it('exibe estado de vazio se nenhum livro for encontrado', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: [] }) 
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) });

    render(<CatalogPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum livro encontrado/i)).toBeInTheDocument();
    });
  });

  it('abre BookForm quando o botão "Adicionar Novo Livro" é clicado', async () => {
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

  it('adiciona um novo livro com sucesso', async () => {
    const expectedPlaceholderUrl = `https://placehold.co/300x450.png?text=${encodeURIComponent(mockNewBookFormData.title)}`;
    mockGetDocs
      .mockResolvedValueOnce({ docs: [] }) // Carregamento inicial de livros
      .mockResolvedValueOnce({ docs: [] }) // Carregamento inicial de clientes
      // Após adicionar, fetchBooksAndClients é chamado novamente
      .mockResolvedValueOnce({ docs: [{ id: 'novo-livro-id', data: () => ({ ...mockNewBookFormData, status: 'Disponível', coverImageUrl: expectedPlaceholderUrl, addedDate: { toMillis: () => Date.now() }}) }] }) 
      .mockResolvedValueOnce({ docs: [] }); // Recarregar clientes

    render(<CatalogPage />);
    await screen.findByText(/Nenhum livro encontrado/i); 

    fireEvent.click(screen.getByRole('button', { name: /Adicionar Novo Livro/i }));
    await screen.findByTestId('book-form');
    
    fireEvent.submit(screen.getByTestId('book-form')); 

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'collectionRef', path: 'books' }), 
        expect.objectContaining({
          ...mockNewBookFormData, 
          coverImageUrl: expectedPlaceholderUrl, // Espera a URL do placeholder
          status: 'Disponível',
          addedDate: expect.any(Object), // Timestamp
        })
      );
      expect(mockToast).toHaveBeenCalledWith({ title: 'Livro adicionado com sucesso!' });
    });
     await waitFor(() => expect(screen.getByText(mockNewBookFormData.title)).toBeInTheDocument());
  });

  it('edita um livro existente com sucesso', async () => {
     const editableBook = { ...mockBooks[0], title: "Livro Editável", id: "id-editavel" };
     mockGetDocs
      .mockResolvedValueOnce({ docs: [{ id: editableBook.id, data: () => ({...editableBook, addedDate: { toMillis: () => editableBook.addedDate }}) }] }) // Carrega livro para editar
      .mockResolvedValueOnce({ docs: [] }) // Carrega clientes
      // Após editar, fetchBooksAndClients é chamado
      .mockResolvedValueOnce({ docs: [{ id: editableBook.id, data: () => ({...editableBook, ...mockEditedBookFormData, addedDate: { toMillis: () => editableBook.addedDate }}) }] }) 
      .mockResolvedValueOnce({ docs: [] }); // Recarrega clientes
      
    render(<CatalogPage />);
    await screen.findByText(editableBook.title);

    fireEvent.click(screen.getByTestId(`book-card-${editableBook.id}-edit-button`)); 

    await screen.findByTestId('book-form'); 
    fireEvent.submit(screen.getByTestId('book-form')); 

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'docRef', path: 'books', id: editableBook.id }), 
        expect.objectContaining({
          ...mockEditedBookFormData,
          // A página mantém status e datas originais ao editar apenas os campos do formulário
          status: editableBook.status, 
          borrowedByClientId: editableBook.borrowedByClientId,
          borrowedByName: editableBook.borrowedByName,
          borrowedDate: editableBook.borrowedDate ? expect.any(Object) : null,
          addedDate: expect.any(Object),
        })
      );
      expect(mockToast).toHaveBeenCalledWith({ title: 'Livro atualizado com sucesso!' });
    });
     await waitFor(() => expect(screen.getByText(mockEditedBookFormData.title)).toBeInTheDocument());
  });

  it('exclui um livro com sucesso', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) // 1. Livros (inicial)
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }) // 2. Clientes (inicial)
      .mockResolvedValueOnce({ docs: [] }) // 3. LoanActivities para o livro a ser excluído (retorna vazio)
      // Após excluir, fetchBooksAndClients é chamado
      .mockResolvedValueOnce({ docs: [mockBooks[1]].map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) // 4. Livros (recarregar)
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }); // 5. Clientes (recarregar)

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
    const bookToLoan = mockBooks[0]; // Livro Um (Disponível)
    mockGetDocs
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) 
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }) 
      // Após emprestar, fetchBooksAndClients é chamado
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, status: b.id === bookToLoan.id ? 'Emprestado' : b.status, borrowedByClientId: b.id === bookToLoan.id ? mockClients[0].id : b.borrowedByClientId, borrowedByName: b.id === bookToLoan.id ? mockClients[0].name : b.borrowedByName, borrowedDate: b.id === bookToLoan.id ? { toMillis: () => Date.now()} : (b.borrowedDate ? { toMillis: () => b.borrowedDate } : null) , addedDate: { toMillis: () => b.addedDate }}) })) }) 
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }); 

    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => mockClients[0] }); 

    render(<CatalogPage />);
    await screen.findByText(bookToLoan.title); 

    fireEvent.click(screen.getByTestId(`book-card-${bookToLoan.id}-loan-button`));
    
    await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalledWith(expect.objectContaining({type: 'docRef', path: 'books', id: bookToLoan.id}), expect.objectContaining({
            status: 'Emprestado',
            borrowedByClientId: mockClients[0].id,
            borrowedByName: mockClients[0].name,
            borrowedDate: expect.any(Object) // Timestamp
        }));
        expect(mockAddDoc).toHaveBeenCalledWith(expect.objectContaining({type: 'collectionRef', path: 'loanActivities'}), expect.objectContaining({ 
            bookId: bookToLoan.id,
            bookTitle: bookToLoan.title,
            clientId: mockClients[0].id,
            clientName: mockClients[0].name, 
            type: 'loan',
            loanDate: expect.any(Object) // Timestamp
        }));
        expect(mockToast).toHaveBeenCalledWith({ title: 'Livro emprestado com sucesso!' });
    });
  });

  it('devolve um livro com sucesso', async () => {
    const bookToReturn = mockBooks[1]; // Livro Dois (Emprestado)
    mockGetDocs
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, addedDate: { toMillis: () => b.addedDate }, borrowedDate: b.borrowedDate ? { toMillis: () => b.borrowedDate } : null }) })) }) 
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }) 
      // Após devolver, fetchBooksAndClients é chamado
      .mockResolvedValueOnce({ docs: mockBooks.map(b => ({ id: b.id, data: () => ({...b, status: b.id === bookToReturn.id ? 'Disponível' : b.status, borrowedByClientId: b.id === bookToReturn.id ? null : b.borrowedByClientId, borrowedByName: b.id === bookToReturn.id ? null : b.borrowedByName, borrowedDate: b.id === bookToReturn.id ? null : (b.borrowedDate ? { toMillis: () => b.borrowedDate } : null), addedDate: { toMillis: () => b.addedDate }}) })) }) 
      .mockResolvedValueOnce({ docs: mockClients.map(c => ({ id: c.id, data: () => c })) }); 

    render(<CatalogPage />);
    await screen.findByText(bookToReturn.title); 

    fireEvent.click(screen.getByTestId(`book-card-${bookToReturn.id}-return-button`));

    await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalledWith(expect.objectContaining({type: 'docRef', path: 'books', id: bookToReturn.id}), expect.objectContaining({
            status: 'Disponível',
            borrowedByClientId: null,
            borrowedByName: null,
            borrowedDate: null
        }));
        expect(mockAddDoc).toHaveBeenCalledWith(expect.objectContaining({type: 'collectionRef', path: 'loanActivities'}), expect.objectContaining({ 
            bookId: bookToReturn.id,
            bookTitle: bookToReturn.title,
            clientId: bookToReturn.borrowedByClientId, 
            clientName: bookToReturn.borrowedByName,
            type: 'return',
            loanDate: expect.any(Object) // Timestamp
        }));
        expect(mockToast).toHaveBeenCalledWith({ title: 'Livro devolvido com sucesso!' });
    });
  });
});
