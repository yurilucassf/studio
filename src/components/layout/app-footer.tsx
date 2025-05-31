'use client';

export function AppFooter() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-background p-4 text-center text-sm text-muted-foreground">
      © {currentYear} BiblioFlow. Todos os direitos reservados. ( Trabalho de teste e manutenção de software - PUC Minas )
    </footer>
  );
}
