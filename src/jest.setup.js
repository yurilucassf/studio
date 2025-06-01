
import '@testing-library/jest-dom';

// Automatically clear mock calls, instances and results before every test
beforeEach(() => {
  jest.clearAllMocks();
});


// Mock para window.HTMLElement.prototype.scrollIntoView
// Esta função é frequentemente usada por bibliotecas de UI (como Radix) para rolar elementos para a visualização,
// mas não é implementada no JSDOM, causando erros em testes.
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
}


// Você pode adicionar outros setups globais aqui, e.g., mocking global objects or functions

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: jest.fn(() => '/mock-path'),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));


// Se você precisar mockar propriedades específicas da window, como matchMedia para o hook useIsMobile:
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true, // Adicionado para permitir redefinição nos testes
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

global.confirm = jest.fn(() => true); // Auto-confirma qualquer diálogo de confirmação
