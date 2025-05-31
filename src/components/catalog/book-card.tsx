'use client';

import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ClientSelectForLoan } from './client-select-for-loan';
import { MoreVertical, Edit3, Trash2, ArrowRightLeft, Undo, CheckCircle } from 'lucide-react';
import type { Book, Client } from '@/lib/types';
import { useState } from 'react';

interface BookCardProps {
  book: Book;
  clients: Client[]; 
  onEdit: (book: Book) => void;
  onDelete: (bookId: string) => void;
  onLoanOrReturn: (book: Book, action: 'loan' | 'return', clientId?: string) => void;
}

export function BookCard({ book, clients, onEdit, onDelete, onLoanOrReturn }: BookCardProps) {
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

  const handleLoan = (clientId: string) => {
    onLoanOrReturn(book, 'loan', clientId);
    setIsLoanDialogOpen(false);
  };

  const handleReturn = () => {
    onLoanOrReturn(book, 'return');
    setIsReturnDialogOpen(false);
  };

  const coverImage = book.coverImageUrl || `https://placehold.co/300x450.png?text=${encodeURIComponent(book.title)}`;

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <CardHeader className="p-4 relative">
        <div className="aspect-[2/3] w-full relative mb-3 rounded-md overflow-hidden bg-muted">
          <Image
            src={coverImage}
            alt={`Capa do livro ${book.title}`}
            layout="fill"
            objectFit="cover"
          />
        </div>
        <CardTitle className="text-lg font-semibold leading-tight text-foreground truncate" title={book.title}>{book.title}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground truncate">{book.author}</CardDescription>
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(book)}>
                <Edit3 className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(book.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow space-y-2 text-sm">
        <p><span className="font-medium text-muted-foreground">ISBN:</span> {book.isbn}</p>
        <p><span className="font-medium text-muted-foreground">Gênero:</span> <Badge variant="outline">{book.genre}</Badge></p>
        <p><span className="font-medium text-muted-foreground">Ano:</span> {book.publicationYear}</p>
        <div>
          <span className="font-medium text-muted-foreground">Status: </span>
          <Badge variant={book.status === 'Disponível' ? 'default' : 'secondary'} className={book.status === 'Disponível' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-yellow-100 text-yellow-700 border-yellow-300'}>
            {book.status}
          </Badge>
        </div>
        {book.status === 'Emprestado' && book.borrowedByName && (
           <p className="text-xs text-muted-foreground">Emprestado para: {book.borrowedByName}</p>
        )}
         {book.status === 'Emprestado' && book.borrowedDate && (
           <p className="text-xs text-muted-foreground">Data: {new Date(book.borrowedDate).toLocaleDateString()}</p>
        )}
      </CardContent>
      <CardFooter className="p-4">
        {book.status === 'Disponível' ? (
          <Dialog open={isLoanDialogOpen} onOpenChange={setIsLoanDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-primary hover:bg-primary/90">
                <ArrowRightLeft className="mr-2 h-4 w-4" /> Emprestar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Emprestar Livro: {book.title}</DialogTitle>
              </DialogHeader>
              <ClientSelectForLoan clients={clients} onSelectClient={handleLoan} />
            </DialogContent>
          </Dialog>
        ) : (
          <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Undo className="mr-2 h-4 w-4" /> Devolver
              </Button>
            </DialogTrigger>
             <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Devolução</DialogTitle>
                <CardDescription>Deseja registrar a devolução do livro "{book.title}"?</CardDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleReturn}><CheckCircle className="mr-2 h-4 w-4"/>Confirmar Devolução</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardFooter>
    </Card>
  );
}
