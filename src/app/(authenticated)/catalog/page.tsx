'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, BookOpenCheck, Loader2 } from 'lucide-react';
import type { Book } from '@/lib/types';
import { BookCard } from '@/components/catalog/book-card';
import { BookForm } from '@/components/catalog/book-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookFilters, type BookFiltersState } from '@/components/catalog/book-filters';
import { useToast } from '@/hooks/use-toast';

// Mock data for demonstration
const mockBooks: Book[] = [
  { id: '1', title: 'A Revolução dos Bichos', author: 'George Orwell', isbn: '978-8535909551', genre: 'Ficção Distópica', publicationYear: 1945, status: 'Disponível', addedDate: new Date().getTime(), coverImageUrl: 'https://placehold.co/300x450.png' , dataAiHint: 'animal farm' },
  { id: '2', title: 'O Senhor dos Anéis: A Sociedade do Anel', author: 'J.R.R. Tolkien', isbn: '978-8533613379', genre: 'Fantasia', publicationYear: 1954, status: 'Emprestado', borrowedByClientId: 'client001', borrowedDate: new Date().getTime(), addedDate: new Date().getTime(), coverImageUrl: 'https://placehold.co/300x450.png', dataAiHint: 'fantasy landscape' },
  { id: '3', title: 'Orgulho e Preconceito', author: 'Jane Austen', isbn: '978-8525419148', genre: 'Romance', publicationYear: 1813, status: 'Disponível', addedDate: new Date().getTime(), coverImageUrl: 'https://placehold.co/300x450.png', dataAiHint: 'vintage portrait' },
  { id: '4', title: 'Fahrenheit 451', author: 'Ray Bradbury', isbn: '978-8525055000', genre: 'Ficção Científica', publicationYear: 1953, status: 'Disponível', addedDate: new Date().getTime(), coverImageUrl: 'https://placehold.co/300x450.png', dataAiHint: 'burning book' },
];


export default function CatalogPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const { toast } = useToast();

  const [filters, setFilters] = useState<BookFiltersState>({
    searchTerm: '',
    genre: '',
    status: '',
  });

  useEffect(() => {
    // Simulate fetching books
    const fetchBooks = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      // In a real app, fetch from Firestore based on filters
      setBooks(mockBooks);
      setIsLoading(false);
    };
    fetchBooks();
  }, []);

  const handleFormSubmit = async (bookData: Book) => {
    // Placeholder for actual save/update logic
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    if (editingBook) {
      setBooks(books.map(b => b.id === editingBook.id ? { ...b, ...bookData, id: editingBook.id } : b));
      toast({ title: 'Livro atualizado com sucesso!' });
    } else {
      const newBook = { ...bookData, id: String(Date.now()), addedDate: Date.now() };
      setBooks([newBook, ...books]);
      toast({ title: 'Livro adicionado com sucesso!' });
    }
    setIsLoading(false);
    setIsFormOpen(false);
    setEditingBook(null);
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setIsFormOpen(true);
  };

  const handleDeleteBook = async (bookId: string) => {
    // Placeholder for actual delete logic
    if (confirm('Tem certeza que deseja excluir este livro?')) {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setBooks(books.filter(b => b.id !== bookId));
      toast({ title: 'Livro excluído com sucesso!' });
      setIsLoading(false);
    }
  };

  const handleLoanOrReturn = async (book: Book, action: 'loan' | 'return', clientId?: string) => {
    // Placeholder
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const updatedBook = {
      ...book,
      status: action === 'loan' ? 'Emprestado' : ('Disponível' as Book['status']),
      borrowedByClientId: action === 'loan' ? clientId : null,
      borrowedDate: action === 'loan' ? Date.now() : null,
    };
    setBooks(books.map(b => b.id === book.id ? updatedBook : b));
    toast({ title: `Livro ${action === 'loan' ? 'emprestado' : 'devolvido'} com sucesso!` });
    setIsLoading(false);
  };
  
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const searchTermMatch = filters.searchTerm.toLowerCase() === '' ||
        book.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        book.isbn.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const genreMatch = filters.genre === '' || book.genre === filters.genre;
      const statusMatch = filters.status === '' || book.status === filters.status;
      return searchTermMatch && genreMatch && statusMatch;
    });
  }, [books, filters]);

  const handleClearFilters = () => {
    setFilters({ searchTerm: '', genre: '', status: '' });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground">Catálogo de Livros</h1>
        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingBook(null); }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Adicionar Novo Livro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingBook ? 'Editar Livro' : 'Adicionar Novo Livro'}</DialogTitle>
            </DialogHeader>
            <BookForm
              onSubmit={handleFormSubmit}
              initialData={editingBook}
              onCancel={() => { setIsFormOpen(false); setEditingBook(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <BookFilters filters={filters} onFiltersChange={setFilters} onClearFilters={handleClearFilters} />

      {isLoading && books.length === 0 ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Carregando livros...</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="text-center py-10 bg-card rounded-lg shadow">
          <BookOpenCheck className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">Nenhum livro encontrado</h3>
          <p className="text-muted-foreground">
            {filters.searchTerm || filters.genre || filters.status ? "Tente ajustar seus filtros ou " : "Parece que não há livros no catálogo ainda. "}
            <DialogTrigger asChild>
              <Button variant="link" className="p-0 h-auto" onClick={() => { setEditingBook(null); setIsFormOpen(true);}}>
                adicione um novo livro
              </Button>
            </DialogTrigger>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onEdit={handleEditBook}
              onDelete={handleDeleteBook}
              onLoanOrReturn={handleLoanOrReturn}
              // Mock clients for ClientSelectForLoan
              clients={[{id: 'client001', name: 'João Silva', email: 'joao@example.com'}, {id: 'client002', name: 'Maria Souza', email: 'maria@example.com'}]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
