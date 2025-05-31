'use client'; 

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Authenticated section error:", error);
  }, [error]);

  return (
    <div className="flex flex-grow flex-col items-center justify-center p-6 text-center">
      <ShieldAlert className="h-16 w-16 text-destructive mb-5" />
      <h2 className="text-2xl font-semibold text-foreground mb-3">Opa, algo não saiu como esperado.</h2>
      <p className="text-md text-muted-foreground mb-6 max-w-lg">
        Encontramos um problema ao carregar esta seção. Por favor, tente novamente.
        Se o problema persistir, contate o suporte.
      </p>
      <Button onClick={() => reset()} size="lg">
        Recarregar Seção
      </Button>
       {error?.message && (
        <details className="mt-6 text-sm text-muted-foreground bg-secondary p-3 rounded-md max-w-lg">
          <summary className="cursor-pointer">Detalhes técnicos</summary>
          <pre className="mt-2 whitespace-pre-wrap text-left font-code text-xs">{error.stack}</pre>
        </details>
      )}
    </div>
  );
}
