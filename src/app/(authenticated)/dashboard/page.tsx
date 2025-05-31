'use client';

import { useState, useEffect } from 'react';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Book, Users, BookCheck, BookX, Users2, ListChecks, History } from 'lucide-react';
import type { Book as BookType, LoanActivity, DashboardStats } from '@/lib/types';
import { useAuthStore } from '@/hooks/use-auth-store';
// Placeholder for actual data fetching functions
// import { getDashboardStats, getRecentBooks, getRecentLoans } from '@/lib/services/dashboardService';

// Mock data for demonstration
const mockStats: DashboardStats = {
  totalBooks: 1250,
  borrowedBooks: 320,
  availableBooks: 930,
  totalClients: 450,
  totalEmployees: 12,
};

const mockRecentBooks: BookType[] = [
  { id: '1', title: 'A Arte da Guerra', author: 'Sun Tzu', isbn: '978-8576876543', genre: 'Filosofia', publicationYear: 2023, status: 'Disponível', addedDate: new Date('2024-07-15').getTime() },
  { id: '2', title: 'Sapiens: Uma Breve História da Humanidade', author: 'Yuval Noah Harari', isbn: '978-8535923870', genre: 'História', publicationYear: 2024, status: 'Emprestado', borrowedDate: new Date('2024-07-20').getTime(), borrowedByClientId: 'client123', addedDate: new Date('2024-07-10').getTime() },
  { id: '3', title: 'O Hobbit', author: 'J.R.R. Tolkien', isbn: '978-0547928227', genre: 'Fantasia', publicationYear: 2022, status: 'Disponível', addedDate: new Date('2024-07-01').getTime() },
];

const mockRecentLoans: LoanActivity[] = [
  { id: 'loan1', bookTitle: 'Sapiens', clientNameOrId: 'Ana Silva', loanDate: new Date('2024-07-20').getTime(), type: 'loan' },
  { id: 'loan2', bookTitle: '1984', clientNameOrId: 'Carlos Pereira (ID: client456)', loanDate: new Date('2024-07-18').getTime(), type: 'loan' },
  { id: 'loan3', bookTitle: 'O Pequeno Príncipe', clientNameOrId: 'Sofia Costa', loanDate: new Date('2024-07-15').getTime(), type: 'return' },
];


export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBooks, setRecentBooks] = useState<BookType[]>([]);
  const [recentLoans, setRecentLoans] = useState<LoanActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    // Simulate data fetching
    const fetchData = async () => {
      setIsLoading(true);
      // Replace with actual API calls:
      // const fetchedStats = await getDashboardStats();
      // const fetchedBooks = await getRecentBooks(3);
      // const fetchedLoans = await getRecentLoans(3);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      setStats(mockStats);
      setRecentBooks(mockRecentBooks);
      setRecentLoans(mockRecentLoans);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-headline font-semibold text-foreground">Painel da Biblioteca</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Total de Livros" value={stats?.totalBooks ?? 0} icon={Book} isLoading={isLoading} description="Livros no catálogo" />
        <StatCard title="Livros Emprestados" value={stats?.borrowedBooks ?? 0} icon={BookX} isLoading={isLoading} description="Atualmente com clientes" />
        <StatCard title="Livros Disponíveis" value={stats?.availableBooks ?? 0} icon={BookCheck} isLoading={isLoading} description="Prontos para empréstimo" />
        <StatCard title="Total de Clientes" value={stats?.totalClients ?? 0} icon={Users} isLoading={isLoading} description="Clientes registrados" />
        {(isAdmin || stats?.totalEmployees) && (
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
            {isLoading ? (
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
             {isLoading ? (
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
                    <TableHead>Cliente/ID</TableHead>
                    <TableHead>Data</TableHead>
                     <TableHead className="text-right">Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.bookTitle}</TableCell>
                      <TableCell>{loan.clientNameOrId}</TableCell>
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
