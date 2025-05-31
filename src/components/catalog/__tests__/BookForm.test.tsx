import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BookForm } from '../book-form';
import { BOOK_GENRES } from '@/lib/constants';
import type { Book } from '@/lib/types';

const mockOnSubmit = jest.fn();
const mockOnCancel = jest.fn();

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock para os componentes Select do shadcn/ui
jest.mock('@/components/ui/select', () => {
  const originalModule = jest.requireActual('@/components/ui/select');
  return {
    ...originalModule,
    Select: ({ children, onValueChange, defaultValue }: { children: React.ReactNode, onValueChange: (value: string) => void, defaultValue?: string }) => {
      // Mantém o estado interno para simular a seleção
      const [currentValue, setCurrentValue] = React.useState(defaultValue);
      const handleChange = (value: string) => {
        setCurrentValue(value);
        if (onValueChange) {
          onValueChange(value);
        }
      };
      return <div data-testid="select-mock" data-current-value={currentValue} onChange={(e: any) => handleChange(e.target.value)}>{children}</div>;
    },
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button" role="combobox">{children}</button>,
    SelectValue: ({ placeholder }: { placeholder: string }) => <span data-testid="select-value-mock">{placeholder}</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode, value: string }) => (
      <div role="option" data-value={value} onClick={() => {
        // Simula a propagação da mudança para o mock do Select pai
        const selectMock = document.querySelector('[data-testid="select-mock"]');
        if (selectMock) {
          const changeEvent = new Event('change', { bubbles: true });
          // Precisamos de uma maneira de passar o valor para o Select mockado
          // Esta é uma forma, mas pode precisar de ajuste dependendo de como o FormField se integra
          Object.defineProperty(changeEvent, 'target', { writable: false, value: { value } });
          selectMock.dispatchEvent(changeEvent);
        }
      }}>
        {children}
      </div>
    ),
  };
});


describe('BookForm', () => {
  beforeEach(() => {
    mockOnSubmit.mockReset();
    mockOnCancel.mockClear();
  });

  const renderBookForm = (initialData?: Book | null) => {
    render(<BookForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} initialData={initialData} />);
  };

  it('renderiza todos os campos do formulário corretamente para adicionar um novo livro', () => {
    renderBookForm();
    expect(screen.getByLabelText(/Título/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Autor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ISBN/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Gênero/i)).toBeInTheDocument(); // Label para o Select
    expect(screen.getByLabelText(/Ano de Publicação/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/URL da Imagem da Capa/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar Livro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
  });

  it('preenche os campos do formulário quando initialData é fornecido para edição', () => {
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
    // Para o Select mockado, a verificação do valor é mais complexa.
    // Verificamos se o placeholder do SelectValue (mockado) reflete o gênero.
    // Ou, se o mock do Select mantiver o estado, verificamos esse estado.
    // O mock atual usa data-current-value no div do Select.
    const selectElement = screen.getByTestId('select-mock');
    expect(selectElement).toHaveAttribute('data-current-value', initialData.genre);

    expect(screen.getByLabelText(/Ano de Publicação/i)).toHaveValue(initialData.publicationYear);
    expect(screen.getByLabelText(/URL da Imagem da Capa/i)).toHaveValue(initialData.coverImageUrl);
  });

  it('chama onSubmit com os dados do formulário quando submetido para um novo livro', async () => {
    renderBookForm();

    fireEvent.change(screen.getByLabelText(/Título/i), { target: { value: 'Novo Livro Interessante' } });
    fireEvent.change(screen.getByLabelText(/Autor/i), { target: { value: 'Novo Autor Criativo' } });
    fireEvent.change(screen.getByLabelText(/ISBN/i), { target: { value: '9876543210' } }); // 10 chars
    fireEvent.change(screen.getByLabelText(/Ano de Publicação/i), { target: { value: '2023' } });
    
    // Interação com o Select mockado
    const genreToSelect = BOOK_GENRES[1]; // "Fantasia"
    const genreTrigger = screen.getByRole('combobox', { name: /Gênero/i }); // O label é associado ao trigger pelo FormLabel
    fireEvent.click(genreTrigger); // Abre as opções (no mock, isso não faz muito visualmente)

    // Encontra a opção pelo seu data-value (conforme o mock do SelectItem) e clica nela
    // Esta parte é crucial e depende de como o mock foi implementado.
    // O mock atual do SelectItem simula o click e tenta atualizar o Select pai.
    const selectMockContainer = screen.getByTestId('select-mock'); // O container do Select mockado
    fireEvent.change(selectMockContainer, { target: { value: genreToSelect } });


    fireEvent.click(screen.getByRole('button', { name: /Salvar Livro/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Novo Livro Interessante',
        author: 'Novo Autor Criativo',
        isbn: '9876543210',
        genre: genreToSelect,
        publicationYear: 2023, 
        coverImageUrl: '', 
      });
    });
  });

   it('chama onSubmit com os dados atualizados do formulário ao editar um livro', async () => {
    const initialData: Book = {
      id: '1',
      title: 'Livro Original',
      author: 'Autor Original',
      isbn: '1112223334445', 
      genre: BOOK_GENRES[0],
      publicationYear: 2020,
      status: 'Disponível',
      addedDate: Date.now(),
      coverImageUrl: 'http://example.com/cover.jpg',
    };
    renderBookForm(initialData);

    fireEvent.change(screen.getByLabelText(/Título/i), { target: { value: 'Título Atualizado com Sucesso' } });
    fireEvent.change(screen.getByLabelText(/Ano de Publicação/i), { target: { value: '2021' } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar Livro/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Título Atualizado com Sucesso',
        author: initialData.author, 
        isbn: initialData.isbn, 
        genre: initialData.genre, 
        publicationYear: 2021, 
        coverImageUrl: initialData.coverImageUrl, 
      }));
    });
  });


  it('chama onCancel quando o botão Cancelar é clicado', () => {
    renderBookForm();
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('mostra erros de validação para campos obrigatórios se vazios', async () => {
    renderBookForm();
    fireEvent.click(screen.getByRole('button', { name: /Salvar Livro/i }));

    expect(await screen.findByText('Título é obrigatório.')).toBeInTheDocument();
    expect(await screen.findByText('Autor é obrigatório.')).toBeInTheDocument();
    expect(await screen.findByText('ISBN deve ter pelo menos 10 caracteres.')).toBeInTheDocument();
    expect(await screen.findByText('Gênero é obrigatório.')).toBeInTheDocument(); 
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
