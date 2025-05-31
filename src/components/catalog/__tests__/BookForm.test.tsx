
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BookForm } from '../book-form';
import { BOOK_GENRES } from '@/lib/constants';
import type { Book } from '@/lib/types';

const mockOnSubmit = jest.fn();
const mockOnCancel = jest.fn();

// Mock useToast as it's used internally but not directly relevant to BookForm's core logic
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('BookForm', () => {
  beforeEach(() => {
    mockOnSubmit.mockImplementation(async () => Promise.resolve());
    mockOnCancel.mockClear();
  });

  const renderBookForm = (initialData?: Book | null) => {
    render(<BookForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} initialData={initialData} />);
  };

  it('renders all form fields correctly for adding a new book', () => {
    renderBookForm();
    expect(screen.getByLabelText(/Título/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Autor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ISBN/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Gênero/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ano de Publicação/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/URL da Imagem da Capa/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar Livro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
  });

  it('pre-fills form fields when initialData is provided for editing', () => {
    const initialData: Book = {
      id: '1',
      title: 'Livro Teste Editavel',
      author: 'Autor Teste',
      isbn: '1234567890123',
      genre: BOOK_GENRES[0],
      publicationYear: 2022,
      coverImageUrl: 'http://example.com/cover.jpg',
      status: 'Disponível',
      addedDate: Date.now(),
    };
    renderBookForm(initialData);

    expect(screen.getByLabelText(/Título/i)).toHaveValue(initialData.title);
    expect(screen.getByLabelText(/Autor/i)).toHaveValue(initialData.author);
    expect(screen.getByLabelText(/ISBN/i)).toHaveValue(initialData.isbn);
    expect(screen.getByLabelText(/Gênero/i)).toHaveTextContent(initialData.genre);
    expect(screen.getByLabelText(/Ano de Publicação/i)).toHaveValue(initialData.publicationYear);
    expect(screen.getByLabelText(/URL da Imagem da Capa/i)).toHaveValue(initialData.coverImageUrl);
  });

  it('calls onSubmit with form data when submitted for a new book', async () => {
    renderBookForm();

    fireEvent.change(screen.getByLabelText(/Título/i), { target: { value: 'Novo Livro' } });
    fireEvent.change(screen.getByLabelText(/Autor/i), { target: { value: 'Novo Autor' } });
    fireEvent.change(screen.getByLabelText(/ISBN/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/Ano de Publicação/i), { target: { value: '2023' } });
    
    // For Select, we need to find the trigger, click it, then click the item
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Gênero/i }));
    await screen.findByText(BOOK_GENRES[1]); // Wait for options to appear
    fireEvent.click(screen.getByText(BOOK_GENRES[1]));

    fireEvent.click(screen.getByRole('button', { name: /Salvar Livro/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Novo Livro',
        author: 'Novo Autor',
        isbn: '9876543210',
        genre: BOOK_GENRES[1],
        publicationYear: 2023,
        coverImageUrl: '', // Optional field, empty by default
      });
    });
  });

   it('calls onSubmit with updated form data when editing a book', async () => {
    const initialData: Book = {
      id: '1',
      title: 'Livro Original',
      author: 'Autor Original',
      isbn: '1112223334445',
      genre: BOOK_GENRES[0],
      publicationYear: 2020,
      status: 'Disponível',
      addedDate: Date.now(),
    };
    renderBookForm(initialData);

    fireEvent.change(screen.getByLabelText(/Título/i), { target: { value: 'Título Atualizado' } });
    fireEvent.change(screen.getByLabelText(/Ano de Publicação/i), { target: { value: '2021' } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar Livro/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Título Atualizado',
        author: initialData.author, // Not changed
        isbn: initialData.isbn, // Not changed
        genre: initialData.genre, // Not changed
        publicationYear: 2021,
        coverImageUrl: '', // Assuming it was empty or not changed
      });
    });
  });


  it('calls onCancel when cancel button is clicked', () => {
    renderBookForm();
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('shows validation errors for required fields if empty (integration with Zod)', async () => {
    renderBookForm();
    // Attempt to submit without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /Salvar Livro/i }));

    // Check for Zod error messages (these depend on your schema)
    // For `react-hook-form` and `zodResolver`, errors appear after submit attempt
    expect(await screen.findByText('Título é obrigatório.')).toBeInTheDocument();
    expect(await screen.findByText('Autor é obrigatório.')).toBeInTheDocument();
    expect(await screen.findByText('ISBN deve ter pelo menos 10 caracteres.')).toBeInTheDocument();
    expect(await screen.findByText('Gênero é obrigatório.')).toBeInTheDocument();
    // publicationYear might have a default, so it might not show an error initially if not touched

    // onSubmit should not have been called if validation failed
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
