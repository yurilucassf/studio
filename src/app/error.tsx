'use client'; 

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <AlertTriangle className="h-20 w-20 text-destructive mb-6" />
      <h1 className="text-4xl font-bold text-foreground mb-4">Algo deu errado!</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        Ocorreu um erro inesperado. Pedimos desculpas pelo inconveniente.
        Você pode tentar recarregar a página ou voltar mais tarde.
      </p>
      <div className="space-x-4">
        <Button onClick={() => reset()} size="lg">
          Tentar Novamente
        </Button>
        <Button variant="outline" size="lg" onClick={() => window.location.href = '/'}>
          Voltar para o Início
        </Button>
      </div>
      {error?.message && (
        <details className="mt-8 text-sm text-muted-foreground bg-secondary p-4 rounded-md max-w-xl">
          <summary>Detalhes do erro (para desenvolvedores)</summary>
          <pre className="mt-2 whitespace-pre-wrap text-left font-code text-xs">{error.stack}</pre>
        </details>
      )}
    </div>
  );
}
