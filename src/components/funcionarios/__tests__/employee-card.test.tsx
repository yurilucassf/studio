import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmployeeCard } from "../employee-card";

const mockEmployeeAdmin = {
    id: "12345678abcdef",
    name: "Usuário Admin",
    email: "admin@example.com",
    role: "admin" as "admin",
};

const mockEmployeeUser = {
    id: "87654321fedcba",
    name: "Usuário Comum",
    email: "user@example.com",
    role: "employee" as "employee",
};

describe("EmployeeCard", () => {
    it("renderiza nome, email e ID parcial do funcionário", () => {
        render(
            <EmployeeCard
                employee={mockEmployeeAdmin}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
                isLastAdmin={false}
            />
        );
        expect(screen.getByText("Usuário Admin")).toBeInTheDocument();
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
        expect(screen.getByText(/ID: 12345678\.\.\./)).toBeInTheDocument();
    });

    it("exibe badge e ícone de admin para administrador", () => {
        render(
            <EmployeeCard
                employee={mockEmployeeAdmin}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
                isLastAdmin={false}
            />
        );
        expect(screen.getByText("Administrador")).toBeInTheDocument();
        expect(screen.getByTitle("Usuário Admin")).toBeInTheDocument();
    });

    it("exibe badge e ícone de funcionário para funcionário comum", () => {
        render(
            <EmployeeCard
                employee={mockEmployeeUser}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
                isLastAdmin={false}
            />
        );
        expect(screen.getByText("Funcionário")).toBeInTheDocument();
        expect(screen.getByTitle("Usuário Comum")).toBeInTheDocument();
    });

    it("chama onEdit ao clicar no botão Editar", () => {
        const onEdit = jest.fn();
        render(
            <EmployeeCard
                employee={mockEmployeeUser}
                onEdit={onEdit}
                onDelete={jest.fn()}
                isLastAdmin={false}
            />
        );
        fireEvent.click(screen.getByText("Editar"));
        expect(onEdit).toHaveBeenCalledWith(mockEmployeeUser);
    });

    it("chama onDelete ao clicar em Confirmar no diálogo", () => {
        const onDelete = jest.fn();
        render(
            <EmployeeCard
                employee={mockEmployeeUser}
                onEdit={jest.fn()}
                onDelete={onDelete}
                isLastAdmin={false}
            />
        );
        fireEvent.click(screen.getByText("Excluir"));
        expect(screen.getByText("Confirmar Exclusão")).toBeInTheDocument();
        fireEvent.click(screen.getByText("Confirmar"));
        expect(onDelete).toHaveBeenCalledWith(mockEmployeeUser.id, mockEmployeeUser.role);
    });

    it("desabilita botão de excluir se funcionário é o usuário atual", () => {
        render(
            <EmployeeCard
                employee={mockEmployeeUser}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
                currentUserId={mockEmployeeUser.id}
                isLastAdmin={false}
            />
        );
        const deleteButton = screen.getByText("Excluir").closest("button");
        expect(deleteButton).toBeDisabled();
        expect(deleteButton).toHaveAttribute("title", "Não é possível excluir este usuário");
    });

    it("desabilita botão de excluir se funcionário é o último admin", () => {
        render(
            <EmployeeCard
                employee={mockEmployeeAdmin}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
                isLastAdmin={true}
            />
        );
        const deleteButton = screen.getByText("Excluir").closest("button");
        expect(deleteButton).toBeDisabled();
        expect(deleteButton).toHaveAttribute("title", "Não é possível excluir este usuário");
    });

    it("habilita botão de excluir para outros funcionários", () => {
        render(
            <EmployeeCard
                employee={mockEmployeeUser}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
                currentUserId="outra-id"
                isLastAdmin={false}
            />
        );
        const deleteButton = screen.getByText("Excluir").closest("button");
        expect(deleteButton).not.toBeDisabled();
    });
});