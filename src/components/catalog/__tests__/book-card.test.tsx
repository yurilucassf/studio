import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookCard } from '../book-card';

// Mock next/image
jest.mock('next/image', () => (props: any) => {
    return <img {...props} alt={props.alt} />;
});

// Mock ClientSelectForLoan
jest.mock('../client-select-for-loan', () => ({
    ClientSelectForLoan: ({ clients, onSelectClient }: any) => (
        <div data-testid="client-select-for-loan">
            {clients.map((client: any) => (
                <button
                    key={client.id}
                    onClick={() => onSelectClient(client.id)}
                    data-testid={`select-client-${client.id}`}
                >
                    {client.name}
                </button>
            ))}
        </div>
    ),
}));

const livroDisponivel = {
    id: '1',
    title: 'Código Limpo',
    author: 'Robert C. Martin',
    isbn: '9780132350884',
    genre: 'Programação',
    publicationYear: 2008,
    status: 'Disponível',
    coverImageUrl: '',
};

const livroEmprestado = {
    ...livroDisponivel,
    status: 'Emprestado',
    borrowedByName: 'Alice',
    borrowedDate: '2023-10-01T00:00:00.000Z',
};

const clientesMock = [
    { id: 'c1', name: 'Alice' },
    { id: 'c2', name: 'Bob' },
];

describe('BookCard', () => {
    it('deve renderizar as informações do livro', () => {
        render(
            <BookCard
                book={livroDisponivel as any}
                clients={clientesMock as any}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
                onLoanOrReturn={jest.fn()}
            />
        );
        expect(screen.getByText('Código Limpo')).toBeInTheDocument();
        expect(screen.getByText('Robert C. Martin')).toBeInTheDocument();
        expect(screen.getByText('9780132350884')).toBeInTheDocument();
        expect(screen.getByText('Programação')).toBeInTheDocument();
        expect(screen.getByText('2008')).toBeInTheDocument();
        expect(screen.getByText('Disponível')).toBeInTheDocument();
        expect(screen.getByTestId('book-card-1-loan-action')).toBeInTheDocument();
    });

    it('deve exibir o diálogo de empréstimo e chamar onLoanOrReturn ao selecionar um cliente', async () => {
        const onLoanOrReturn = jest.fn();
        render(
            <BookCard
                book={livroDisponivel as any}
                clients={clientesMock as any}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
                onLoanOrReturn={onLoanOrReturn}
            />
        );
        fireEvent.click(screen.getByTestId('book-card-1-loan-action'));
        expect(await screen.findByText(/Emprestar Livro/)).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('select-client-c2'));
        await waitFor(() => {
            expect(onLoanOrReturn).toHaveBeenCalledWith(expect.any(Object), 'loan', 'c2');
        });
    });

    it('deve exibir as informações de empréstimo quando o livro estiver emprestado', () => {
        render(
            <BookCard
                book={livroEmprestado as any}
                clients={clientesMock as any}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
                onLoanOrReturn={jest.fn()}
            />
        );
        expect(screen.getByText(/Emprestado para: Alice/)).toBeInTheDocument();
        expect(screen.getByText(/Data:/)).toBeInTheDocument();
    });
});
