import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClientCard } from "../client-card";

const mockClient = {
    id: "12345678abcdefgh",
    name: "John Doe",
    email: "john@example.com",
    phone: "123-456-7890",
};

describe("ClientCard", () => {
    it("renderiza nome, email e id parcial do cliente", () => {
        render(
            <ClientCard
                client={mockClient}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
            />
        );
        expect(screen.getByText("John Doe")).toBeInTheDocument();
        expect(screen.getByText("john@example.com")).toBeInTheDocument();
        expect(screen.getByText(/ID: 12345678\.\.\./)).toBeInTheDocument();
    });

    it("renderiza telefone do cliente se presente", () => {
        render(
            <ClientCard
                client={mockClient}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
            />
        );
        expect(screen.getByText("123-456-7890")).toBeInTheDocument();
    });

    it("não renderiza telefone se não estiver presente", () => {
        const clientNoPhone = { ...mockClient, phone: undefined };
        render(
            <ClientCard
                client={clientNoPhone}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
            />
        );
        expect(screen.queryByText("123-456-7890")).not.toBeInTheDocument();
    });

    it("chama onEdit com o cliente ao clicar no botão Editar", () => {
        const onEdit = jest.fn();
        render(
            <ClientCard
                client={mockClient}
                onEdit={onEdit}
                onDelete={jest.fn()}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: /Editar/i }));
        expect(onEdit).toHaveBeenCalledWith(mockClient);
    });

    it("exibe o diálogo de confirmação ao clicar em Excluir", () => {
        render(
            <ClientCard
                client={mockClient}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: /Excluir/i }));
        expect(screen.getByText(/Confirmar Exclusão/i)).toBeInTheDocument();
        expect(
            screen.getByText(
                `Tem certeza que deseja excluir o cliente "${mockClient.name}"? Esta ação não pode ser desfeita.`
            )
        ).toBeInTheDocument();
    });

    it("chama onDelete com o id do cliente ao clicar em Confirmar no diálogo", () => {
        const onDelete = jest.fn();
        render(
            <ClientCard
                client={mockClient}
                onEdit={jest.fn()}
                onDelete={onDelete}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: /Excluir/i }));
        fireEvent.click(screen.getByRole("button", { name: /Confirmar/i }));
        expect(onDelete).toHaveBeenCalledWith(mockClient.id);
    });
});