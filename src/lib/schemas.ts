import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
});
export type LoginFormData = z.infer<typeof LoginSchema>;

export const BookSchema = z.object({
  title: z.string().min(1, { message: "Título é obrigatório." }),
  author: z.string().min(1, { message: "Autor é obrigatório." }),
  isbn: z.string().min(10, { message: "ISBN deve ter pelo menos 10 caracteres." }).max(13, { message: "ISBN não pode ter mais que 13 caracteres."}),
  genre: z.string().min(1, { message: "Gênero é obrigatório." }),
  publicationYear: z.coerce.number().int().min(1000, { message: "Ano de publicação inválido." }).max(new Date().getFullYear(), { message: "Ano de publicação não pode ser no futuro." }),
  coverImageUrl: z.string().url({ message: "URL da capa inválida." }).optional().or(z.literal('')),
});
export type BookFormData = z.infer<typeof BookSchema>;


export const ClientSchema = z.object({
  name: z.string().min(1, { message: "Nome completo é obrigatório." }),
  email: z.string().email({ message: "Email inválido." }),
  phone: z.string().optional(),
});
export type ClientFormData = z.infer<typeof ClientSchema>;

export const AddEmployeeSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório." }),
  email: z.string().email({ message: "Email inválido." }),
  password: z.string().min(6, { message: "Senha inicial deve ter pelo menos 6 caracteres." }),
  role: z.enum(['employee', 'admin'], { message: "Papel inválido." }),
});
export type AddEmployeeFormData = z.infer<typeof AddEmployeeSchema>;

export const EditEmployeeSchema = z.object({
  name: z.string().min(1, { message: "Nome é obrigatório." }),
  role: z.enum(['employee', 'admin'], { message: "Papel inválido." }),
});
export type EditEmployeeFormData = z.infer<typeof EditEmployeeSchema>;

export const LoanSchema = z.object({
  clientId: z.string().min(1, { message: "Por favor, selecione um cliente." }),
});
export type LoanFormData = z.infer<typeof LoanSchema>;
