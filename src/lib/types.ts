import type { User as FirebaseUser } from 'firebase/auth';

export interface User extends FirebaseUser {
  role?: 'admin' | 'employee'; // 'funcionario' is 'employee'
  name?: string;
}

export type BookStatus = 'Disponível' | 'Emprestado';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  genre: string;
  publicationYear: number;
  status: BookStatus;
  coverImageUrl?: string;
  borrowedByClientId?: string | null;
  borrowedByName?: string | null; // For display convenience
  borrowedDate?: number | null; // Timestamp
  addedDate: number; // Timestamp for "Últimos Livros Adicionados"
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface Employee {
  id: string; // UID from Firebase Auth
  name: string;
  email: string;
  role: 'admin' | 'employee';
}

export interface LoanActivity {
  id: string;
  bookTitle: string;
  clientNameOrId: string; // Could be name if available, or ID
  loanDate: number; // Timestamp
  type: 'loan' | 'return';
}

export interface DashboardStats {
  totalBooks: number;
  borrowedBooks: number;
  availableBooks: number;
  totalClients: number;
  totalEmployees: number;
}
