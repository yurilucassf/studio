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
  const OriginalReact = require('react'); // Importar React dentro da fábrica
  const originalModule = jest.requireActual('@/components/ui/select');
  return {
    ...originalModule,
    Select: ({ children, onValueChange, defaultValue, ...props }: { children: React.ReactNode, onValueChange: (value: string) => void, defaultValue?: string, [key: string]: any }) => {
      const [currentValue, setCurrentValue] = OriginalReact.useState(defaultValue);
      const handleChange = (value: string) => {
        setCurrentValue(value);
        if (onValueChange) {
          onValueChange(value);
        }
      };
      // Passar props desconhecidas para o div para compatibilidade com FormField/Controller
      return <div data-testid="select-mock" {...props} data-current-value={currentValue} onChange={(e: any) => handleChange(e.target.value)}>{children}</div>;
    },
    SelectTrigger: ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => <button type="button" role="combobox" {...props}>{children}</button>,
    SelectValue: ({ placeholder }: { placeholder: string }) => <span data-testid="select-value-mock">{placeholder}</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value, ...props }: { children: React.ReactNode, value: string, [key: string]: any }) => (
      <div role="option" data-value={value} {...props} onClick={() => {
        const selectMock = document.querySelector('[data-testid="select-mock"]');
        if (selectMock) {
          // Para simular a atualização do valor no react-hook-form, precisamos que o onValueChange seja chamado.
          // A forma mais simples é assumir que o Select pai tem uma prop para isso ou que o Controller do RHF a fornece.
          // O mock do 'Select' já chama onValueChange, então um clique aqui pode ser só para simular a interação do usuário.
          // A lógica de atualização do valor real está no mock do Select.
          const selectElement = selectMock.closest('[data-testid="select-mock"]');
          if (selectElement && typeof (selectElement as any).onChange === 'function') {
             (selectElement as any).onChange({ target: { value } });
          }
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
    expect(screen.getByLabelText(/Gênero/i)).toBeInTheDocument(); 
    expect(screen.getByLabelText(/Ano de Publicação/i)).toBeInTheDocument();
    // expect(screen.getByLabelText(/URL da Imagem da Capa/i)).toBeInTheDocument(); // Campo opcional, não mais obrigatório
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
      coverImageUrl: '', // Não precisa mais de URL
      status: 'Disponível',
      addedDate: Date.now(),
    };
    renderBookForm(initialData);

    expect(screen.getByLabelText(/Título/i)).toHaveValue(initialData.title);
    expect(screen.getByLabelText(/Autor/i)).toHaveValue(initialData.author);
    expect(screen.getByLabelText(/ISBN/i)).toHaveValue(initialData.isbn);
    
    const selectElement = screen.getByTestId('select-mock'); // O FormItem do Gênero
    // O valor do Select é gerenciado pelo Controller do react-hook-form.
    // O mock do Select deve refletir o defaultValue passado pelo Controller.
    // O Controller passa o valor através da prop 'value' para o componente 'Select' mockado.
    // O mock do 'Select' pega defaultValue e o usa para o estado inicial.
    // Vamos verificar se o data-current-value no mock do Select reflete o gênero.
    // (O Controller passa `defaultValue` para o `Select` que o mock usa)
    expect(selectElement).toHaveAttribute('data-current-value', initialData.genre);


    expect(screen.getByLabelText(/Ano de Publicação/i)).toHaveValue(initialData.publicationYear);
    // expect(screen.getByLabelText(/URL da Imagem da Capa/i)).toHaveValue(initialData.coverImageUrl); // Removido
  });

  it('chama onSubmit com os dados do formulário quando submetido para um novo livro', async () => {
    renderBookForm();

    fireEvent.change(screen.getByLabelText(/Título/i), { target: { value: 'Novo Livro Interessante' } });
    fireEvent.change(screen.getByLabelText(/Autor/i), { target: { value: 'Novo Autor Criativo' } });
    fireEvent.change(screen.getByLabelText(/ISBN/i), { target: { value: '9876543210' } }); 
    fireEvent.change(screen.getByLabelText(/Ano de Publicação/i), { target: { value: '2023' } });
    
    const genreToSelect = BOOK_GENRES[1]; 
    const genreTrigger = screen.getByRole('combobox', { name: /Gênero/i });
    fireEvent.mouseDown(genreTrigger); // Abre as opções

    const optionElement = await screen.findByRole('option', { name: genreToSelect, hidden: false });
    fireEvent.click(optionElement); 

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
      coverImageUrl: '',
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
    // Para o Select, o erro pode ser mais genérico ou específico dependendo de como RHF e Zod interagem com o mock
    // A mensagem "Gênero é obrigatório." deve aparecer se o valor não for selecionado.
    expect(await screen.findByText('Gênero é obrigatório.')).toBeInTheDocument(); 
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
