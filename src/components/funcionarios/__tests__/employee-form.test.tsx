import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EmployeeForm } from "../employee-form";
const toast = require("@/hooks/use-toast").useToast().toast;

// Mock de dependências
jest.mock("@/hooks/use-toast", () => ({
    useToast: () => ({
        toast: jest.fn(),
    }),
}));

// Mock de componentes de UI (mínimo, apenas para evitar erros)
jest.mock("@/components/ui/button", () => ({
    Button: (props: any) => <button {...props} />,
}));
jest.mock("@/components/ui/input", () => ({
    Input: (props: any) => <input {...props} />,
}));
jest.mock("@/components/ui/select", () => ({
    Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
    SelectTrigger: ({ children }: any) => <>{children}</>,
    SelectValue: ({ placeholder }: any) => <>{placeholder}</>,
}));
jest.mock("@/components/ui/form", () => ({
    Form: ({ children }: any) => <>{children}</>,
    FormControl: ({ children }: any) => <>{children}</>,
    FormField: ({ render, ...props }: any) => render({ field: { ...props, value: "", onChange: jest.fn() } }),
    FormItem: ({ children }: any) => <div>{children}</div>,
    FormLabel: ({ children }: any) => <label>{children}</label>,
    FormMessage: () => null,
}));

describe("EmployeeForm", () => {
    const defaultProps = {
        onSubmit: jest.fn().mockResolvedValue(undefined),
        onCancel: jest.fn(),
        isSubmitting: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });



    it("chama onCancel ao clicar em Cancelar", () => {
        render(<EmployeeForm {...defaultProps} />);
        fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
        expect(defaultProps.onCancel).toHaveBeenCalled();
    });

});