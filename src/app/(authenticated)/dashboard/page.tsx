'use client';

import { useState, useEffect, useCallback } from 'react';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Book, Users, BookCheck, BookX, Users2, ListChecks, History, Loader2 } from 'lucide-react';
import type { Book as BookType, LoanActivity, DashboardStats } from '@/lib/types';
import { useAuthStore } from '@/hooks/use-auth-store';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBooks, setRecentBooks] = useState<BookType[]>([]);
  const [recentLoans, setRecentLoans] = useState<LoanActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch stats
      const booksCollection = collection(db, 'books');
      const clientsCollection = collection(db, 'clients');
      const employeesCollection = collection(db, 'employees');
      const loanActivitiesCollection = collection(db, 'loanActivities');

      const booksSnapshot = await getDocs(booksCollection);
      const borrowedBooksQuery = query(booksCollection, where('status', '==', 'Emprestado'));
      const borrowedBooksSnapshot = await getDocs(borrowedBooksQuery);
      const clientsSnapshot = await getDocs(clientsCollection);
      const employeesSnapshot = await getDocs(employeesCollection);

      const totalBooks = booksSnapshot.size;
      const borrowedBooks = borrowedBooksSnapshot.size;
      const fetchedStats: DashboardStats = {
        totalBooks,
        borrowedBooks,
        availableBooks: totalBooks - borrowedBooks,
        totalClients: clientsSnapshot.size,
        totalEmployees: employeesSnapshot.size,
      };
      setStats(fetchedStats);

      // Fetch recent books
      const recentBooksQuery = query(booksCollection, orderBy('addedDate', 'desc'), limit(3));
      const recentBooksSnapshot = await getDocs(recentBooksQuery);
      const fetchedRecentBooks = recentBooksSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          addedDate: (data.addedDate as Timestamp)?.toMillis() || Date.now(),
          borrowedDate: (data.borrowedDate as Timestamp)?.toMillis() || null,
        } as BookType;
      });
      setRecentBooks(fetchedRecentBooks);

      // Fetch recent loans
      const recentLoansQuery = query(loanActivitiesCollection, orderBy('loanDate', 'desc'), limit(3));
      const recentLoansSnapshot = await getDocs(recentLoansQuery);
      const fetchedRecentLoans = recentLoansSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          loanDate: (data.loanDate as Timestamp)?.toMillis() || Date.now(),
        } as LoanActivity;
      });
      setRecentLoans(fetchedRecentLoans);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({ title: "Erro ao carregar dados do painel", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Painel da Biblioteca</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Total de Livros" value={stats?.totalBooks ?? 0} icon={Book} isLoading={isLoading} description="Livros no catálogo" />
        <StatCard title="Livros Emprestados" value={stats?.borrowedBooks ?? 0} icon={BookX} isLoading={isLoading} description="Atualmente com clientes" />
        <StatCard title="Livros Disponíveis" value={stats?.availableBooks ?? 0} icon={BookCheck} isLoading={isLoading} description="Prontos para empréstimo" />
        <StatCard title="Total de Clientes" value={stats?.totalClients ?? 0} icon={Users} isLoading={isLoading} description="Clientes registrados" />
        {(isAdmin || (stats && stats.totalEmployees > 0) ) && ( // Show if admin or if there are employees
          <StatCard title="Total de Funcionários" value={stats?.totalEmployees ?? 0} icon={Users2} isLoading={isLoading} description="Equipe da biblioteca" />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary" />Últimos Livros Adicionados</CardTitle>
            <CardDescription>Os 3 livros mais recentes no catálogo.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && recentBooks.length === 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Autor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[...Array(3)].map((_, i) => ( <TableRow key={i}><TableCell colSpan={3}><div className="h-8 w-full bg-muted animate-pulse rounded"></div></TableCell></TableRow>))}
                </TableBody>
              </Table>
            ) : recentBooks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBooks.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell className="font-medium">{book.title}</TableCell>
                      <TableCell>{book.author}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={book.status === 'Disponível' ? 'default' : 'secondary'} className={book.status === 'Disponível' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-black'}>
                          {book.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">Nenhum livro adicionado recentemente.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><History className="mr-2 h-5 w-5 text-primary" />Atividade Recente de Empréstimos</CardTitle>
            <CardDescription>Os 3 empréstimos/devoluções mais recentes.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading && recentLoans.length === 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>Livro</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Tipo</TableHead></TableRow></TableHeader>
                <TableBody>
                   {[...Array(3)].map((_, i) => ( <TableRow key={i}><TableCell colSpan={4}><div className="h-8 w-full bg-muted animate-pulse rounded"></div></TableCell></TableRow>))}
                </TableBody>
              </Table>
            ) : recentLoans.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Livro</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                     <TableHead className="text-right">Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.bookTitle}</TableCell>
                      <TableCell>{loan.clientName}</TableCell>
                      <TableCell>{new Date(loan.loanDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={loan.type === 'loan' ? 'destructive' : 'default'} className={loan.type === 'loan' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}>
                          {loan.type === 'loan' ? 'Empréstimo' : 'Devolução'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">Nenhuma atividade de empréstimo recente.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
