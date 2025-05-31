import type { User as FirebaseUser } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';

export interface User extends FirebaseUser {
  role?: 'admin' | 'employee';
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
  borrowedByName?: string | null; 
  borrowedDate?: number | null; // Timestamp (milliseconds) on client, Firestore Timestamp on server
  addedDate: number; // Timestamp (milliseconds) on client, Firestore Timestamp on server
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
  bookId: string;
  bookTitle: string;
  clientId?: string; // Optional as it might not be relevant for all activities or if client is deleted
  clientName: string; 
  loanDate: number; // Timestamp (milliseconds) on client, Firestore Timestamp on server
  type: 'loan' | 'return';
}

export interface DashboardStats {
  totalBooks: number;
  borrowedBooks: number;
  availableBooks: number;
  totalClients: number;
  totalEmployees: number;
}
