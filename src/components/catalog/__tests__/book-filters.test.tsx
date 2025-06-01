import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookFilters, BookFiltersState } from "../book-filters";

// Mock constantes
jest.mock("@/lib/constants", () => ({
    BOOK_GENRES: ["Ficção", "Não Ficção", "Fantasia"],
    BOOK_STATUS_OPTIONS: ["Todos", "Disponível", "Emprestado"],
}));

// Mock componentes de UI
jest.mock("@/components/ui/input", () => ({
    Input: (props: any) => <input {...props} />,
}));
jest.mock("@/components/ui/select", () => ({
    Select: ({ value, onValueChange, children }: any) => (
        <select
            value={value}
            onChange={e => onValueChange(e.target.value)}
            data-testid="select"
        >
            {children}
        </select>
    ),
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ value, children }: any) => (
        <option value={value}>{children}</option>
    ),
    SelectTrigger: ({ children }: any) => <>{children}</>,
    SelectValue: ({ placeholder }: any) => <>{placeholder}</>,
}));
jest.mock("@/components/ui/button", () => ({
    Button: ({ onClick, children, ...props }: any) => (
        <button onClick={onClick} {...props}>
            {children}
        </button>
    ),
}));
jest.mock("@/components/ui/card", () => ({
    Card: ({ children }: any) => <div>{children}</div>,
    CardContent: ({ children }: any) => <div>{children}</div>,
}));
jest.mock("lucide-react", () => ({
    Search: () => <span data-testid="icon-search" />,
    X: () => <span data-testid="icon-x" />,
}));

describe("BookFilters", () => {
    const filtrosPadrao: BookFiltersState = {
        searchTerm: "",
        genre: "",
        status: "",
    };

    it("deve chamar onFiltersChange ao digitar no campo de busca", () => {
        const onFiltersChange = jest.fn();
        render(
            <BookFilters
                filters={filtrosPadrao}
                onFiltersChange={onFiltersChange}
                onClearFilters={jest.fn()}
            />
        );
        const input = screen.getByPlaceholderText(/Título, autor, ISBN/i);
        fireEvent.change(input, { target: { value: "Harry Potter" } });
        expect(onFiltersChange).toHaveBeenCalledWith({
            ...filtrosPadrao,
            searchTerm: "Harry Potter",
        });
    });

    it("deve chamar onFiltersChange ao mudar o gênero", () => {
        const onFiltersChange = jest.fn();
        render(
            <BookFilters
                filters={filtrosPadrao}
                onFiltersChange={onFiltersChange}
                onClearFilters={jest.fn()}
            />
        );
        const genreSelect = screen.getAllByTestId("select")[0];
        fireEvent.change(genreSelect, { target: { value: "Fantasia" } });
        expect(onFiltersChange).toHaveBeenCalledWith({
            ...filtrosPadrao,
            genre: "Fantasia",
        });
    });

    it("deve chamar onFiltersChange ao mudar o status", () => {
        const onFiltersChange = jest.fn();
        render(
            <BookFilters
                filters={filtrosPadrao}
                onFiltersChange={onFiltersChange}
                onClearFilters={jest.fn()}
            />
        );
        const statusSelect = screen.getAllByTestId("select")[1];
        fireEvent.change(statusSelect, { target: { value: "Disponível" } });
        expect(onFiltersChange).toHaveBeenCalledWith({
            ...filtrosPadrao,
            status: "Disponível",
        });
    });

    it("deve chamar onClearFilters ao clicar no botão de limpar filtros", () => {
        const onClearFilters = jest.fn();
        render(
            <BookFilters
                filters={filtrosPadrao}
                onFiltersChange={jest.fn()}
                onClearFilters={onClearFilters}
            />
        );
        const button = screen.getByRole("button", { name: /Limpar Filtros/i });
        fireEvent.click(button);
        expect(onClearFilters).toHaveBeenCalled();
    });

    it("deve exibir os valores selecionados nos selects", () => {
        const filtros: BookFiltersState = {
            searchTerm: "",
            genre: "Ficção",
            status: "Emprestado",
        };
        render(
            <BookFilters
                filters={filtros}
                onFiltersChange={jest.fn()}
                onClearFilters={jest.fn()}
            />
        );
        const genreSelect = screen.getAllByTestId("select")[0] as HTMLSelectElement;
        const statusSelect = screen.getAllByTestId("select")[1] as HTMLSelectElement;
        expect(genreSelect.value).toBe("Ficção");
        expect(statusSelect.value).toBe("Emprestado");
    });


});
