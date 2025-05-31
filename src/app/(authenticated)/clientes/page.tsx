'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserRound, Loader2 } from 'lucide-react';
import type { Client } from '@/lib/types';
import { ClientCard } from '@/components/clientes/client-card';
import { ClientForm } from '@/components/clientes/client-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

// Mock data
const mockClients: Client[] = [
  { id: '1', name: 'Ana Beatriz Costa', email: 'ana.costa@example.com', phone: '11987654321' },
  { id: '2', name: 'Carlos Eduardo Lima', email: 'carlos.lima@example.com', phone: '21912345678' },
  { id: '3', name: 'Daniela Fernandes Alves', email: 'daniela.alves@example.com' },
  { id: '4', name: 'Eduardo Moreira Silva', email: 'eduardo.silva@example.com', phone: '31999998888' },
];

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchClients = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      setClients(mockClients);
      setIsLoading(false);
    };
    fetchClients();
  }, []);

  const handleFormSubmit = async (clientData: Client) => {
    // Placeholder for actual save/update logic
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    if (editingClient) {
      setClients(clients.map(c => c.id === editingClient.id ? { ...c, ...clientData, id: editingClient.id } : c));
      toast({ title: 'Cliente atualizado com sucesso!' });
    } else {
      const newClient = { ...clientData, id: String(Date.now()) }; // Mock ID generation
      setClients([newClient, ...clients]);
      toast({ title: 'Cliente adicionado com sucesso!' });
    }
    setIsLoading(false);
    setIsFormOpen(false);
    setEditingClient(null);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    // Placeholder for actual delete logic
     if (confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setClients(clients.filter(c => c.id !== clientId));
      toast({ title: 'Cliente excluído com sucesso!' });
      setIsLoading(false);
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
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Adicionar Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</DialogTitle>
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
             <DialogTrigger asChild>
              <Button variant="link" className="p-0 h-auto" onClick={() => { setEditingClient(null); setIsFormOpen(true);}}>
                adicione um novo cliente
              </Button>
            </DialogTrigger>
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
