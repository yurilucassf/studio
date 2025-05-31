'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCog, Mail, ShieldCheck, UserCircle, Edit3, Trash2 } from 'lucide-react';
import type { Employee } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface EmployeeCardProps {
  employee: Employee;
  onEdit: (employee: Employee) => void;
  onDelete: (employeeId: string, employeeRole: 'admin' | 'employee') => void;
  currentUserId?: string;
  isLastAdmin: boolean;
}

export function EmployeeCard({ employee, onEdit, onDelete, currentUserId, isLastAdmin }: EmployeeCardProps) {
  const partialId = employee.id.substring(0, 8);
  const isCurrentUser = employee.id === currentUserId;
  const cannotDelete = isCurrentUser || (isLastAdmin && employee.role === 'admin');


  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-3">
         <div className="flex items-center gap-3 mb-2">
            {employee.role === 'admin' ? <ShieldCheck className="h-8 w-8 text-accent" /> : <UserCircle className="h-8 w-8 text-primary" />}
            <div>
                <CardTitle className="text-lg font-semibold text-foreground leading-tight" title={employee.name}>{employee.name}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">ID: {partialId}...</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="h-4 w-4 flex-shrink-0" />
          <span className="truncate" title={employee.email}>{employee.email}</span>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Papel: </span>
          <Badge variant={employee.role === 'admin' ? 'destructive' : 'secondary'}>
            {employee.role === 'admin' ? 'Administrador' : 'Funcionário'}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="p-4 border-t border-border/50">
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(employee)}>
            <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={cannotDelete} title={cannotDelete ? "Não é possível excluir este usuário" : ""}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o funcionário "{employee.name}"?
                  Esta ação removerá o registro do sistema. Lembre-se de remover manualmente a conta do Firebase Authentication.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(employee.id, employee.role)}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
