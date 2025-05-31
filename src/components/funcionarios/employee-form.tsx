'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AddEmployeeSchema, EditEmployeeSchema, type AddEmployeeFormData, type EditEmployeeFormData } from '@/lib/schemas';
import type { Employee } from '@/lib/types';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmployeeFormProps {
  onSubmit: (data: Employee, password?: string) => Promise<void>;
  initialData?: Employee | null;
  onCancel: () => void;
  currentUserIsAdmin?: boolean;
  currentUserId?: string;
  isLastAdmin?: boolean;
}

export function EmployeeForm({ onSubmit, initialData, onCancel, currentUserIsAdmin, currentUserId, isLastAdmin }: EmployeeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const isEditing = !!initialData;

  const formSchema = isEditing ? EditEmployeeSchema : AddEmployeeSchema;
  type FormData = isEditing ? EditEmployeeFormData : AddEmployeeFormData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      role: initialData.role,
      ...(isEditing ? {} : { email: initialData.email, password: '' }) // email/password only for add form
    } : {
      name: '',
      email: '',
      password: '',
      role: 'employee',
    } as FormData,
  });

  const handleFormSubmit = async (data: FormData) => {
    setIsLoading(true);

    if (isEditing && initialData) {
      if (initialData.id === currentUserId && initialData.role === 'admin' && data.role === 'employee' && isLastAdmin) {
         toast({ title: "Ação não permitida", description: "Você não pode remover seu próprio status de administrador se for o único.", variant: "destructive" });
         setIsLoading(false);
         return;
      }
      const employeePayload: Employee = {
        ...initialData,
        name: data.name,
        role: data.role,
      };
      await onSubmit(employeePayload);
    } else if (!isEditing) {
      const addData = data as AddEmployeeFormData;
      const employeePayload: Employee = {
        id: '', // Will be set by backend
        name: addData.name,
        email: addData.email,
        role: addData.role,
      };
      await onSubmit(employeePayload, addData.password);
    }
    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Maria Silva" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isEditing && (
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => ( // Type assertion needed if field does not exist on EditEmployeeFormData
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Ex: maria.silva@example.com" {...field as any} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {!isEditing && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha Inicial</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Mínimo 6 caracteres" {...field as any} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Papel</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value} 
                disabled={isLoading || (isEditing && initialData?.id === currentUserId && isLastAdmin && initialData?.role === 'admin')}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um papel" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="employee">Funcionário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              {isEditing && initialData?.id === currentUserId && isLastAdmin && initialData?.role === 'admin' && (
                <p className="text-xs text-muted-foreground mt-1">Não é possível alterar o papel do último administrador.</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Funcionário
          </Button>
        </div>
      </form>
    </Form>
  );
}
