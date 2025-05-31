
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserRound, Loader2 } from 'lucide-react';
import type { Client } from '@/lib/types';
import { ClientCard } from '@/components/clientes/client-card';
import { ClientForm } from '@/components/clientes/client-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import type { ClientFormData } from '@/lib/schemas';

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const clientsQuery = query(collection(db, 'clients'), orderBy('name'));
      const querySnapshot = await getDocs(clientsQuery);
      const clientsData = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Client));
      setClients(clientsData);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      toast({ title: "Erro ao buscar clientes", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleFormSubmit = async (formData: ClientFormData) => {
    setIsLoading(true);
    try {
      if (editingClient) {
        const clientRef = doc(db, 'clients', editingClient.id);
        await updateDoc(clientRef, formData);
        toast({ title: 'Cliente atualizado com sucesso!' });
      } else {
        await addDoc(collection(db, 'clients'), formData);
        toast({ title: 'Cliente adicionado com sucesso!' });
      }
      fetchClients();
      setIsFormOpen(false);
      setEditingClient(null);
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast({ title: "Erro ao salvar cliente", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
      setIsLoading(true);
      try {
        await deleteDoc(doc(db, 'clients', clientId));
        toast({ title: 'Cliente excluído com sucesso!' });
        fetchClients();
      } catch (error) {
        console.error("Erro ao excluir cliente:", error);
        toast({ title: "Erro ao excluir cliente", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.phone && client.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground">Gestão de Clientes</h1>
        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingClient(null); }}>
           <Button onClick={() => { setEditingClient(null); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-5 w-5" /> Adicionar Novo Cliente
          </Button>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</DialogTitle>
              <DialogDescription>
                {editingClient ? 'Modifique os detalhes do cliente abaixo.' : 'Preencha os detalhes abaixo para adicionar um novo cliente.'}
              </DialogDescription>
            </DialogHeader>
            <ClientForm
              onSubmit={handleFormSubmit}
              initialData={editingClient}
              onCancel={() => { setIsFormOpen(false); setEditingClient(null);}}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Input 
        placeholder="Buscar cliente por nome, email ou telefone..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

      {isLoading && clients.length === 0 ? (
         <div className="flex justify-center items-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Carregando clientes...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-10 bg-card rounded-lg shadow">
          <UserRound className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">Nenhum cliente encontrado</h3>
          <p className="text-muted-foreground">
            {searchTerm ? "Tente um termo de busca diferente ou " : "Ainda não há clientes cadastrados. "}
            <Button variant="link" className="p-0 h-auto" onClick={() => { setEditingClient(null); setIsFormOpen(true);}}>
              adicione um novo cliente
            </Button>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={handleEditClient}
              onDelete={handleDeleteClient}
            />
          ))}
        </div>
      )}
    </div>
  );
}
