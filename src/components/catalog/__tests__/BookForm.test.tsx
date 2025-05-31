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

// Mock para os componentes Select do shadcn/ui de forma mais robusta
jest.mock('@/components/ui/select', () => {
  const OriginalReact = require('react'); // Importar React dentro da fábrica
  const originalModule = jest.requireActual('@/components/ui/select');

  // Esta variável armazenará a função onValueChange passada para o componente Select principal.
  // É uma forma de simular o contexto ou passagem de props em um mock de módulo.
  let currentOnValueChange: ((value: string) => void) | undefined;

  return {
    ...originalModule,
    Select: ({ children, onValueChange, value, defaultValue, ...props }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void; // onValueChange é opcional no tipo base, mas RHF o fornecerá
      value?: string;
      defaultValue?: string;
      [key: string]: any;
    }) => {
      // Armazena a função onValueChange fornecida (provavelmente pelo react-hook-form Controller)
      if (onValueChange) {
        currentOnValueChange = onValueChange;
      }
      // O div serve como um contêiner simples. react-hook-form Controler passará 'value' e 'onValueChange'.
      // O data-current-value é apenas para depuração ou asserções, se necessário.
      return (
        <div data-testid="select-mock" {...props} data-current-value={value || defaultValue}>
          {children}
        </div>
      );
    },
    SelectTrigger: ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => (
      // O 'name' ou 'aria-labelledby' no SelectTrigger real vem do FormLabel associado ao FormField.
      // Para que `getByRole('combobox', { name: /Gênero/i })` funcione, o FormLabel deve apontar para o id deste botão.
      // O FormField do react-hook-form cuida dessa associação de id.
      <button type="button" role="combobox" {...props}>
        {children}
      </button>
    ),
    SelectValue: ({ placeholder }: { placeholder: string }) => (
       // O placeholder é exibido pelo SelectTrigger real quando nenhum valor é selecionado.
       // Nosso mock do SelectTrigger pode simplesmente renderizar seus filhos (que incluirão o SelectValue).
      <span data-testid="select-value-mock">{placeholder}</span>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      // O SelectContent real é um popover. No mock, podemos renderizar os filhos diretamente
      // para que os SelectItems estejam no DOM para interação.
      <div>{children}</div>
    ),
    SelectItem: ({ children, value, ...props }: { children: React.ReactNode; value: string; [key: string]: any }) => (
      <div
        role="option"
        data-value={value}
        {...props}
        onClick={() => {
          if (currentOnValueChange) {
            currentOnValueChange(value); // Chama diretamente o onValueChange do react-hook-form
          }
        }}
        // O conteúdo do children (o texto do item) o tornará encontrável por getByText ou findByRole('option', {name: ...})
      >
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
    expect(screen.getByRole('combobox', { name: /Gênero/i })).toBeInTheDocument(); 
    expect(screen.getByLabelText(/Ano de Publicação/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/URL da Imagem da Capa \(Opcional\)/i)).toBeInTheDocument();
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
    
    // Verifica se o mock do Select reflete o valor inicial do gênero
    // O data-current-value foi adicionado ao mock do Select para essa finalidade
    const selectElement = screen.getByTestId('select-mock');
    expect(selectElement).toHaveAttribute('data-current-value', initialData.genre);

    expect(screen.getByLabelText(/Ano de Publicação/i)).toHaveValue(initialData.publicationYear);
    expect(screen.getByLabelText(/URL da Imagem da Capa \(Opcional\)/i)).toHaveValue(initialData.coverImageUrl);
  });

  it('chama onSubmit com os dados do formulário quando submetido para um novo livro', async () => {
    renderBookForm();

    fireEvent.change(screen.getByLabelText(/Título/i), { target: { value: 'Novo Livro Interessante' } });
    fireEvent.change(screen.getByLabelText(/Autor/i), { target: { value: 'Novo Autor Criativo' } });
    fireEvent.change(screen.getByLabelText(/ISBN/i), { target: { value: '9876543210' } }); 
    fireEvent.change(screen.getByLabelText(/Ano de Publicação/i), { target: { value: '2023' } });
    // Não é mais necessário para o teste se a imagem é opcional e não estamos testando o placeholder aqui.
    // fireEvent.change(screen.getByLabelText(/URL da Imagem da Capa \(Opcional\)/i), { target: { value: '' } });
    
    const genreToSelect = BOOK_GENRES[1]; // Ex: "Fantasia"
    // Encontra o SelectTrigger pelo seu label associado (Gênero)
    const genreTrigger = screen.getByRole('combobox', { name: /Gênero/i });
    fireEvent.click(genreTrigger); // Simula o clique para "abrir" (no nosso mock, não abre visualmente, mas é uma boa prática)

    // Encontra e clica no SelectItem desejado. O texto do SelectItem deve ser o próprio gênero.
    // O mock do SelectItem chamará diretamente o onValueChange.
    const optionElement = await screen.findByRole('option', { name: genreToSelect });
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
        coverImageUrl: '', // Se o campo for deixado em branco, deve ser string vazia
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
      coverImageUrl: 'http://example.com/original.jpg',
    };
    renderBookForm(initialData);

    fireEvent.change(screen.getByLabelText(/Título/i), { target: { value: 'Título Atualizado com Sucesso' } });
    fireEvent.change(screen.getByLabelText(/Ano de Publicação/i), { target: { value: '2021' } });
    fireEvent.change(screen.getByLabelText(/URL da Imagem da Capa \(Opcional\)/i), { target: { value: 'http://example.com/updated.jpg' } });


    fireEvent.click(screen.getByRole('button', { name: /Salvar Livro/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Título Atualizado com Sucesso',
        author: initialData.author, 
        isbn: initialData.isbn, 
        genre: initialData.genre, 
        publicationYear: 2021, 
        coverImageUrl: 'http://example.com/updated.jpg', 
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
