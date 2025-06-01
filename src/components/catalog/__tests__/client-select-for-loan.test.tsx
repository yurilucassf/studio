import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClientSelectForLoan } from '../client-select-for-loan';

const mockClients = [
    { id: '1', name: 'Alice', email: 'alice@email.com' },
    { id: '2', name: 'Bob', email: 'bob@email.com' },
];

describe('ClientSelectForLoan', () => {
    it('renderiza input, select e botão', () => {
        render(<ClientSelectForLoan clients={mockClients} onSelectClient={jest.fn()} />);
        expect(screen.getByLabelText(/Buscar Cliente/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Nome ou email do cliente/i)).toBeInTheDocument();
        expect(screen.getByText(/Confirmar Empréstimo/i)).toBeInTheDocument();
        expect(screen.getByText(/Selecione um cliente/i)).toBeInTheDocument();
    });


    it('botão fica desabilitado quando nenhum cliente está selecionado', () => {
        render(<ClientSelectForLoan clients={mockClients} onSelectClient={jest.fn()} />);
        const button = screen.getByRole('button', { name: /Confirmar Empréstimo/i });
        expect(button).toBeDisabled();
    });
});
