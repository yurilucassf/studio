import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppFooter } from './app-footer';

describe('AppFooter', () => {
    it('renderiza o rodapé com o ano atual e o texto correto', () => {
        render(<AppFooter />);
        const anoAtual = new Date().getFullYear();
        const textoEsperado = `© ${anoAtual} BiblioFlow. Todos os direitos reservados. ( Trabalho de teste e manutenção de software - PUC Minas )`;
        expect(screen.getByText(textoEsperado)).toBeInTheDocument();
    });

    it('renderiza um elemento footer com as classes corretas', () => {
        render(<AppFooter />);
        const footer = screen.getByRole('contentinfo');
        expect(footer).toHaveClass(
            'border-t',
            'border-border',
            'bg-background',
            'p-4',
            'text-center',
            'text-sm',
            'text-muted-foreground'
        );
    });
});