
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserCog, ShieldAlert, Loader2 } from 'lucide-react';
import type { Employee } from '@/lib/types';
import { EmployeeCard } from '@/components/funcionarios/employee-card';
import { EmployeeForm } from '@/components/funcionarios/employee-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'; // DialogTrigger removido
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { db, auth as firebaseAuth } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, query, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth'; 
import type { AddEmployeeFormData, EditEmployeeFormData } from '@/lib/schemas';


export default function FuncionariosPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const isAdmin = user?.role === 'admin';

   const fetchEmployees = useCallback(async () => {
    if (!isAdmin && user) { // Adicionado 'user' para garantir que o estado do usuário já foi carregado
      setIsLoadingPage(false);
      return;
    }
    setIsLoadingPage(true);
    try {
      const employeesQuery = query(collection(db, 'employees'), orderBy('name'));
      const querySnapshot = await getDocs(employeesQuery);
      const employeesData = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Employee));
      setEmployees(employeesData);
    } catch (error) {
      console.error("Erro ao buscar funcionários:", error);
      toast({ title: "Erro ao buscar funcionários", variant: "destructive" });
    } finally {
      setIsLoadingPage(false);
    }
  }, [isAdmin, toast, user]); // Adicionado 'user' como dependência

  useEffect(() => {
    // A verificação do admin e o redirecionamento são movidos para dentro do fetchEmployees/renderização
    // para garantir que o estado do usuário (user) já foi carregado pelo AuthProvider.
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    // Este useEffect agora é redundante se a lógica de redirecionamento está no render ou fetch.
    // Mantido por enquanto, mas pode ser simplificado.
    if (!isLoadingPage && !isAdmin && user) { 
      toast({ title: "Acesso Negado", description: "Você não tem permissão para acessar esta página.", variant: "destructive" });
      router.replace('/dashboard');
    }
  }, [user, isAdmin, router, toast, isLoadingPage]);


  const handleFormSubmit = async (formData: AddEmployeeFormData | EditEmployeeFormData) => {
    setIsSubmitting(true);
    try {
      if (editingEmployee) { 
        const { name, role } = formData as EditEmployeeFormData;
        if (editingEmployee.id === user?.uid && editingEmployee.role === 'admin' && role === 'employee') {
          const adminCount = employees.filter(e => e.role === 'admin').length;
          if (adminCount <= 1) {
            toast({ title: "Ação não permitida", description: "Você não pode remover seu próprio status de administrador se for o único.", variant: "destructive" });
            setIsSubmitting(false);
            return;
          }
        }
        const employeeRef = doc(db, 'employees', editingEmployee.id);
        await updateDoc(employeeRef, { name, role });
        toast({ title: 'Funcionário atualizado com sucesso!' });
      } else { 
        const { name, email, password, role } = formData as AddEmployeeFormData;
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        const newAuthUser = userCredential.user;
        
        const employeeRef = doc(db, 'employees', newAuthUser.uid);
        await setDoc(employeeRef, {
          name,
          email,
          role,
        });
        toast({ title: 'Funcionário adicionado com sucesso!' });
      }
      fetchEmployees();
      setIsFormOpen(false);
      setEditingEmployee(null);
    } catch (error: any) {
      console.error("Erro ao salvar funcionário:", error);
      if (error.code?.startsWith('auth/')) {
        toast({ title: "Erro de Autenticação", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Erro ao salvar funcionário", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string, employeeRole: 'admin' | 'employee') => {
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

    if (confirm('Tem certeza que deseja excluir este funcionário? A conta de autenticação associada NÃO será excluída automaticamente e precisará ser removida manualmente do Firebase Console.')) {
      setIsSubmitting(true);
      try {
        await deleteDoc(doc(db, 'employees', employeeId));
        toast({ title: 'Funcionário excluído do Firestore!', description: 'Lembre-se de remover a conta do Firebase Authentication manualmente.' });
        fetchEmployees();
      } catch (error) {
        console.error("Erro ao excluir funcionário do Firestore:", error);
        toast({ title: "Erro ao excluir funcionário do Firestore", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Se o usuário ainda está carregando (AuthProvider), ou se o papel do usuário ainda não foi definido,
  // podemos mostrar um loader geral para evitar piscar a tela de "Acesso Negado".
  if (isLoadingPage || !user) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  
  if (!isAdmin) { // Esta verificação agora acontece depois que 'user' e 'isLoadingPage' estão resolvidos
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ShieldAlert className="h-24 w-24 text-destructive mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-2">Acesso Negado</h1>
        <p className="text-muted-foreground text-lg">Você não tem permissão para visualizar esta página.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-8">Voltar ao Painel</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground">Gerenciar Funcionários</h1>
        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingEmployee(null); }}>
           <Button onClick={() => { setEditingEmployee(null); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-5 w-5" /> Adicionar Novo Funcionário
          </Button>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Editar Funcionário' : 'Adicionar Novo Funcionário'}</DialogTitle>
              <DialogDescription>
                {editingEmployee ? 'Modifique os detalhes do funcionário abaixo.' : 'Preencha os detalhes abaixo para adicionar um novo funcionário.'}
              </DialogDescription>
            </DialogHeader>
            <EmployeeForm
              onSubmit={handleFormSubmit}
              initialData={editingEmployee}
              onCancel={() => { setIsFormOpen(false); setEditingEmployee(null);}}
              currentUserIsAdmin={isAdmin}
              currentUserId={user?.uid}
              isLastAdmin={employees.filter(e => e.role === 'admin').length <= 1 && editingEmployee?.role === 'admin'}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Input 
        placeholder="Buscar funcionário por nome ou email..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
        disabled={!isAdmin}
      />

      {filteredEmployees.length === 0 ? (
        <div className="text-center py-10 bg-card rounded-lg shadow">
          <UserCog className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">Nenhum funcionário encontrado</h3>
          <p className="text-muted-foreground">
             {searchTerm ? "Tente um termo de busca diferente ou " : "Ainda não há funcionários cadastrados. "}
            <Button variant="link" className="p-0 h-auto" onClick={() => { setEditingEmployee(null); setIsFormOpen(true);}}>
              adicione um novo funcionário
            </Button>
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
      ) }
    </div>
  );
}
