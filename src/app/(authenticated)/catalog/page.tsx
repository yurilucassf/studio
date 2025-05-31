'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, BookOpenCheck, Loader2 } from 'lucide-react';
import type { Book, Client } from '@/lib/types';
import { BookCard } from '@/components/catalog/book-card';
import { BookForm } from '@/components/catalog/book-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookFilters, type BookFiltersState } from '@/components/catalog/book-filters';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, Timestamp, getDoc, where, writeBatch } from 'firebase/firestore';
import type { BookFormData } from '@/lib/schemas';

export default function CatalogPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const { toast } = useToast();

  const [filters, setFilters] = useState<BookFiltersState>({
    searchTerm: '',
    genre: '',
    status: '',
  });

  const fetchBooksAndClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const booksQuery = query(collection(db, 'books'), orderBy('addedDate', 'desc'));
      const booksSnapshot = await getDocs(booksQuery);
      const booksData = booksSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          addedDate: (data.addedDate as Timestamp)?.toMillis() || Date.now(),
          borrowedDate: (data.borrowedDate as Timestamp)?.toMillis() || null,
        } as Book;
      });
      setBooks(booksData);

      const clientsSnapshot = await getDocs(collection(db, 'clients'));
      const clientsData = clientsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Client));
      setClients(clientsData);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Erro ao buscar dados", description: "Não foi possível carregar livros e clientes.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBooksAndClients();
  }, [fetchBooksAndClients]);

  const handleFormSubmit = async (formData: BookFormData) => {
    setIsLoading(true);
    try {
      const bookPayload = {
        ...formData,
        publicationYear: Number(formData.publicationYear),
        coverImageUrl: formData.coverImageUrl || `https://placehold.co/300x450.png?text=${encodeURIComponent(formData.title)}`,
      };

      if (editingBook) {
        const bookRef = doc(db, 'books', editingBook.id);
        await updateDoc(bookRef, {
            ...bookPayload,
            // Retain existing status and loan details unless explicitly changed elsewhere
            status: editingBook.status,
            borrowedByClientId: editingBook.borrowedByClientId,
            borrowedByName: editingBook.borrowedByName,
            borrowedDate: editingBook.borrowedDate ? Timestamp.fromMillis(editingBook.borrowedDate) : null,
            addedDate: Timestamp.fromMillis(editingBook.addedDate),
        });
        toast({ title: 'Livro atualizado com sucesso!' });
      } else {
        await addDoc(collection(db, 'books'), {
          ...bookPayload,
          status: 'Disponível' as Book['status'],
          addedDate: Timestamp.now(),
          borrowedByClientId: null,
          borrowedByName: null,
          borrowedDate: null,
        });
        toast({ title: 'Livro adicionado com sucesso!' });
      }
      fetchBooksAndClients(); // Refresh list
      setIsFormOpen(false);
      setEditingBook(null);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({ title: "Erro ao salvar livro", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setIsFormOpen(true);
  };

  const handleDeleteBook = async (bookId: string) => {
    if (confirm('Tem certeza que deseja excluir este livro?')) {
      setIsLoading(true);
      try {
        // Also delete related loan activities
        const batch = writeBatch(db);
        const loanActivitiesQuery = query(collection(db, "loanActivities"), where("bookId", "==", bookId));
        const loanActivitiesSnapshot = await getDocs(loanActivitiesQuery);
        loanActivitiesSnapshot.forEach(docSnap => {
            batch.delete(docSnap.ref);
        });
        
        const bookRef = doc(db, 'books', bookId);
        batch.delete(bookRef);
        
        await batch.commit();

        toast({ title: 'Livro e histórico de empréstimos excluídos com sucesso!' });
        fetchBooksAndClients(); // Refresh list
      } catch (error) {
        console.error("Error deleting book:", error);
        toast({ title: "Erro ao excluir livro", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLoanOrReturn = async (book: Book, action: 'loan' | 'return', selectedClientId?: string) => {
    setIsLoading(true);
    try {
      const bookRef = doc(db, 'books', book.id);
      let clientName = book.borrowedByName || ''; // For returns, use existing name
      let finalClientId = book.borrowedByClientId || '';

      if (action === 'loan') {
        if (!selectedClientId) {
          toast({ title: "Erro", description: "Cliente não selecionado.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        finalClientId = selectedClientId;
        const clientDocSnap = await getDoc(doc(db, 'clients', finalClientId));
        if (clientDocSnap.exists()) {
          clientName = clientDocSnap.data().name;
        } else {
          throw new Error("Client not found");
        }
      }

      const updatedBookData = {
        status: action === 'loan' ? 'Emprestado' : ('Disponível' as Book['status']),
        borrowedByClientId: action === 'loan' ? finalClientId : null,
        borrowedByName: action === 'loan' ? clientName : null,
        borrowedDate: action === 'loan' ? Timestamp.now() : null,
      };
      await updateDoc(bookRef, updatedBookData);

      // Add to loanActivities
      await addDoc(collection(db, 'loanActivities'), {
        bookId: book.id,
        bookTitle: book.title,
        clientId: finalClientId, // Use finalClientId which is set for both loan and return logic path. For return, it's the ID of who borrowed it.
        clientName: clientName, // Use determined clientName. For return, it's who borrowed it.
        loanDate: Timestamp.now(),
        type: action,
      });

      toast({ title: `Livro ${action === 'loan' ? 'emprestado' : 'devolvido'} com sucesso!` });
      fetchBooksAndClients(); // Refresh list
    } catch (error) {
      console.error("Error processing loan/return:", error);
      toast({ title: "Erro ao processar empréstimo/devolução", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
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
              clients={clients}
            />
          ))}
        </div>
      )}
    </div>
  );
}
