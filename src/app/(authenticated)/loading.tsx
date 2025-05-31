'use client';
import { Loader2 } from 'lucide-react';

export default function AuthenticatedLoading() {
  return (
    <div className="flex flex-grow items-center justify-center p-8">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="ml-3 text-md text-muted-foreground">Carregando conteúdo...</p>
    </div>
  );
}
