'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserCog, ShieldAlert, Loader2 } from 'lucide-react';
import type { Employee } from '@/lib/types';
import { EmployeeCard } from '@/components/funcionarios/employee-card';
import { EmployeeForm } from '@/components/funcionarios/employee-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

// Mock data
const mockEmployees: Employee[] = [
  { id: 'admin001', name: 'Admin Geral', email: 'admin@example.com', role: 'admin' },
  { id: 'emp001', name: 'Maria Oliveira', email: 'maria.o@example.com', role: 'employee' },
  { id: 'emp002', name: 'João Santos', email: 'joao.s@example.com', role: 'employee' },
];

export default function FuncionariosPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isLoading && !isAdmin) { // Check isLoading to prevent redirect during initial load
      toast({ title: "Acesso Negado", description: "Você não tem permissão para acessar esta página.", variant: "destructive" });
      router.replace('/dashboard');
    }
  }, [user, isAdmin, router, toast, isLoading]);


  useEffect(() => {
    if (isAdmin) {
      const fetchEmployees = async () => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
        // In a real app, fetch from Firestore
        setEmployees(mockEmployees);
        setIsLoading(false);
      };
      fetchEmployees();
    } else {
      setIsLoading(false); // Not an admin, no data to load from here
    }
  }, [isAdmin]);

  const handleFormSubmit = async (employeeData: Employee, password?: string) => {
    // Placeholder for actual save/update logic (including Firebase Auth for new users)
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    if (editingEmployee) {
      // Prevent self-demotion if last admin
      if (editingEmployee.id === user?.uid && editingEmployee.role === 'admin' && employeeData.role === 'employee') {
        const adminCount = employees.filter(e => e.role === 'admin').length;
        if (adminCount <= 1) {
          toast({ title: "Ação não permitida", description: "Você não pode remover seu próprio status de administrador se for o único.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
      }
      setEmployees(employees.map(e => e.id === editingEmployee.id ? { ...e, ...employeeData, id: editingEmployee.id } : e));
      toast({ title: 'Funcionário atualizado com sucesso!' });
    } else {
      // TODO: Firebase Auth user creation here
      const newEmployee = { ...employeeData, id: String(Date.now()) }; // Mock ID
      setEmployees([newEmployee, ...employees]);
      toast({ title: 'Funcionário adicionado com sucesso! Lembre-se de fornecer a senha inicial.' });
    }
    setIsLoading(false);
    setIsFormOpen(false);
    setEditingEmployee(null);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string, employeeRole: 'admin' | 'employee') => {
    // Placeholder for actual delete logic (Firestore and inform about Auth deletion)
    if (employeeId === user?.uid) {
      toast({ title: "Ação não permitida", description: "Você não pode excluir sua própria conta.", variant: "destructive" });
      return;
    }
    if (employeeRole === 'admin' && user?.role === 'admin') {
        const adminCount = employees.filter(e => e.role === 'admin').length;
        if (adminCount <=1 && employees.find(e => e.id === employeeId)?.role === 'admin') {
             toast({ title: "Ação não permitida", description: "Não é possível excluir o último administrador.", variant: "destructive" });
            return;
        }
    }

    if (confirm('Tem certeza que deseja excluir este funcionário? Lembre-se de remover manualmente a conta do Firebase Authentication.')) {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setEmployees(employees.filter(e => e.id !== employeeId));
      toast({ title: 'Funcionário excluído do sistema!', description: 'Remova a conta do Firebase Authentication manualmente.' });
      setIsLoading(false);
    }
  };
  
  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ShieldAlert className="h-24 w-24 text-destructive mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-2">Acesso Negado</h1>
        <p className="text-muted-foreground text-lg">Você não tem permissão para visualizar esta página.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-8">Voltar ao Painel</Button>
      </div>
    );
  }
  
  if (isLoading && isAdmin) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Carregando funcionários...</p>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground">Gerenciar Funcionários</h1>
        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingEmployee(null); }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Adicionar Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Editar Funcionário' : 'Adicionar Novo Funcionário'}</DialogTitle>
            </DialogHeader>
            <EmployeeForm
              onSubmit={handleFormSubmit}
              initialData={editingEmployee}
              onCancel={() => { setIsFormOpen(false); setEditingEmployee(null);}}
              currentUserIsAdmin={isAdmin}
              currentUserId={user?.uid}
              isLastAdmin={employees.filter(e => e.role === 'admin').length <= 1 && editingEmployee?.role === 'admin'}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Input 
        placeholder="Buscar funcionário por nome ou email..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

      {filteredEmployees.length === 0 && !isLoading ? (
        <div className="text-center py-10 bg-card rounded-lg shadow">
          <UserCog className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">Nenhum funcionário encontrado</h3>
          <p className="text-muted-foreground">
             {searchTerm ? "Tente um termo de busca diferente ou " : "Ainda não há funcionários cadastrados. "}
             <DialogTrigger asChild>
              <Button variant="link" className="p-0 h-auto" onClick={() => { setEditingEmployee(null); setIsFormOpen(true);}}>
                adicione um novo funcionário
              </Button>
            </DialogTrigger>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onEdit={handleEditEmployee}
              onDelete={handleDeleteEmployee}
              currentUserId={user?.uid}
              isLastAdmin={employees.filter(e => e.role === 'admin').length <= 1 && employee.role === 'admin'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
