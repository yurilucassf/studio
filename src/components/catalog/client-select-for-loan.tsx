'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Client } from '@/lib/types';
import { UserCheck } from 'lucide-react';

interface ClientSelectForLoanProps {
  clients: Client[];
  onSelectClient: (clientId: string) => void;
}

export function ClientSelectForLoan({ clients, onSelectClient }: ClientSelectForLoanProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = () => {
    if (selectedClientId) {
      onSelectClient(selectedClientId);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="clientSearch">Buscar Cliente</Label>
        <Input
          id="clientSearch"
          placeholder="Nome ou email do cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-1"
        />
      </div>
      <Select value={selectedClientId} onValueChange={setSelectedClientId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione um cliente" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Clientes</SelectLabel>
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name} ({client.email})
                </SelectItem>
              ))
            ) : (
              <div className="p-2 text-sm text-muted-foreground text-center">Nenhum cliente encontrado.</div>
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button onClick={handleSubmit} disabled={!selectedClientId} className="w-full">
        <UserCheck className="mr-2 h-4 w-4" /> Confirmar Empréstimo
      </Button>
    </div>
  );
}
