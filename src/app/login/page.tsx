import { LoginForm } from '@/components/auth/login-form';
import { BookHeart } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex flex-col items-center text-center">
        <BookHeart className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-headline font-bold text-foreground">
          BiblioFlow
        </h1>
        <p className="text-muted-foreground">Sistema de gerenciamento de biblioteca.</p>
      </div>
      <LoginForm />
    </main>
  );
}
