import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClientForm } from '../client-form';

describe('ClientForm', () => {
    const mockOnSubmit = jest.fn(() => Promise.resolve());
    const mockOnCancel = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renderiza campos vazios quando nenhum initialData é fornecido', () => {
        render(<ClientForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
        expect(screen.getByLabelText(/Nome Completo/i)).toHaveValue('');
        expect(screen.getByLabelText(/Email/i)).toHaveValue('');
        expect(screen.getByLabelText(/Telefone/i)).toHaveValue('');
    });

    it('renderiza campos do formulário com initialData', () => {
        render(
            <ClientForm
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
                initialData={{
                    id: '1',
                    name: 'Maria Teste',
                    email: 'maria@teste.com',
                    phone: '123456789',
                }}
            />
        );
        expect(screen.getByLabelText(/Nome Completo/i)).toHaveValue('Maria Teste');
        expect(screen.getByLabelText(/Email/i)).toHaveValue('maria@teste.com');
        expect(screen.getByLabelText(/Telefone/i)).toHaveValue('123456789');
    });

    it('chama onCancel ao clicar no botão Cancelar', () => {
        render(<ClientForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
        fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('valida campos obrigatórios e exibe mensagens de erro', async () => {
        render(<ClientForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
        fireEvent.click(screen.getByRole('button', { name: /Salvar Cliente/i }));
        await waitFor(() => {
            expect(screen.getAllByText(/obrigatório/i).length).toBeGreaterThan(0);
        });
        expect(mockOnSubmit).not.toHaveBeenCalled();
    });

});