
'use client';

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

// Define a type for the form's internal state, covering all possible fields.
// Email and password are optional here because they only exist in Add mode.
// The specific Zod schema (AddEmployeeSchema or EditEmployeeSchema) will enforce their requirement.
type EmployeeFormValues = {
  name: string;
  email?: string;
  password?: string;
  role: 'employee' | 'admin';
};

interface EmployeeFormProps {
  onSubmit: (data: AddEmployeeFormData | EditEmployeeFormData) => Promise<void>;
  initialData?: Employee | null;
  onCancel: () => void;
  currentUserIsAdmin?: boolean;
  currentUserId?: string;
  isLastAdmin?: boolean;
  isSubmitting?: boolean;
}

export function EmployeeForm({ 
  onSubmit: pageOnSubmit, // Renamed prop for clarity
  initialData, 
  onCancel, 
  currentUserIsAdmin, 
  currentUserId, 
  isLastAdmin, 
  isSubmitting 
}: EmployeeFormProps) {
  const { toast } = useToast();
  const isEditing = !!initialData;

  const formSchema = isEditing ? EditEmployeeSchema : AddEmployeeSchema;

  const form = useForm<EmployeeFormValues>({ // Use EmployeeFormValues here
    resolver: zodResolver(formSchema),
    defaultValues: initialData 
      ? { name: initialData.name, role: initialData.role } // email & password will be undefined by default, which is fine for EmployeeFormValues
      : { name: '', email: '', password: '', role: 'employee' },
  });

  // This handler is called by react-hook-form's handleSubmit after successful validation.
  // The 'validatedData' will be typed according to the schema used (AddEmployeeFormData or EditEmployeeFormData).
  const handleValidatedFormSubmit = async (validatedData: AddEmployeeFormData | EditEmployeeFormData) => {
    if (isEditing && initialData) {
      // validatedData here is EditEmployeeFormData
      const currentRoleSelection = (validatedData as EditEmployeeFormData).role;
      if (initialData.id === currentUserId && initialData.role === 'admin' && currentRoleSelection === 'employee' && isLastAdmin) {
         toast({ title: "Ação não permitida", description: "Você não pode remover seu próprio status de administrador se for o único.", variant: "destructive" });
         return; // Do not proceed to call pageOnSubmit
      }
    }
    await pageOnSubmit(validatedData); // Call the submit handler passed from the page
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleValidatedFormSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Maria Silva" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isEditing && (
          <FormField
            control={form.control}
            name="email" // Refers to EmployeeFormValues.email
            render={({ field }) => ( 
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Ex: maria.silva@example.com" {...field} disabled={isSubmitting} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {!isEditing && (
          <FormField
            control={form.control}
            name="password" // Refers to EmployeeFormValues.password
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha Inicial</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Mínimo 6 caracteres" {...field} disabled={isSubmitting} value={field.value ?? ''} />
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
                disabled={isSubmitting || (isEditing && initialData?.id === currentUserId && isLastAdmin && initialData?.role === 'admin')}
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
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Funcionário
          </Button>
        </div>
      </form>
    </Form>
  );
}
