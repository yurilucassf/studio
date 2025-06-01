import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../stat-card';

// Mock dos componentes Card e Skeleton para evitar problemas de dependência
jest.mock('@/components/ui/card', () => ({
    Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
    CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
    CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
    CardTitle: ({ children, ...props }: any) => <div data-testid="card-title" {...props}>{children}</div>,
    CardDescription: ({ children, ...props }: any) => <div data-testid="card-description" {...props}>{children}</div>,
}));
jest.mock('@/components/ui/skeleton', () => ({
    Skeleton: (props: any) => <div data-testid="skeleton" {...props} />,
}));

const DummyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg data-testid="dummy-icon" {...props} />;

describe('StatCard', () => {
    it('renderiza título, valor e ícone', () => {
        render(
            <StatCard
                title="Usuários"
                value={42}
                icon={DummyIcon}
            />
        );
        expect(screen.getByText('Usuários')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByTestId('dummy-icon')).toBeInTheDocument();
    });

    it('renderiza descrição se fornecida', () => {
        render(
            <StatCard
                title="Receita"
                value="R$1000"
                description="Receita total deste mês"
                icon={DummyIcon}
            />
        );
        expect(screen.getByText('Receita total deste mês')).toBeInTheDocument();
    });

    it('não renderiza descrição se não fornecida', () => {
        render(
            <StatCard
                title="Receita"
                value="R$1000"
                icon={DummyIcon}
            />
        );
        expect(screen.queryByText('Receita total deste mês')).not.toBeInTheDocument();
    });

    it('renderiza skeletons quando isLoading é true e descrição é fornecida', () => {
        render(
            <StatCard
                title="Carregando"
                value="..."
                description="Carregando descrição"
                icon={DummyIcon}
                isLoading
            />
        );
        // Deve renderizar múltiplos skeletons
        expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(4);
        // Não deve renderizar título, valor ou ícone
        expect(screen.queryByText('Carregando')).not.toBeInTheDocument();
        expect(screen.queryByText('...')).not.toBeInTheDocument();
        expect(screen.queryByTestId('dummy-icon')).not.toBeInTheDocument();
    });

    it('renderiza skeletons quando isLoading é true e descrição não é fornecida', () => {
        render(
            <StatCard
                title="Carregando"
                value="..."
                icon={DummyIcon}
                isLoading
            />
        );
        // Deve renderizar pelo menos 3 skeletons (sem skeleton de descrição)
        expect(screen.getAllByTestId('skeleton').length).toBe(3);
    });
});