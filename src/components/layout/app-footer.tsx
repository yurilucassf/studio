'use client';

export function AppFooter() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-background p-4 text-center text-sm text-muted-foreground">
      © {currentYear} BookLook. Todos os direitos reservados.
    </footer>
  );
}
