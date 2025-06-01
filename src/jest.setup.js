
import '@testing-library/jest-dom';

// Automatically clear mock calls, instances and results before every test
beforeEach(() => {
  jest.clearAllMocks();
});


// Mock para window.HTMLElement.prototype.scrollIntoView
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
}

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
  toast: jest.fn(),
}));

// Mock para window.matchMedia mais controlável
const MOCK_MEDIA_QUERY_LIST_INSTANCE = {
  matches: false, 
  media: '(max-width: 767px)',
  onchange: null,
  // Estes são os métodos que o hook useIsMobile efetivamente usa.
  // Serão jest.fn() para que os testes possam espioná-los.
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  // Estes são deprecated mas incluídos para um mock mais completo.
  addListener: jest.fn(), 
  removeListener: jest.fn(),
  // dispatchEvent também é um jest.fn(). Os testes podem mockar sua implementação se necessário.
  dispatchEvent: jest.fn((event) => event.type === 'change'), // Implementação simples padrão
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true, // Crucial para permitir que testes ajustem o mock se necessário
  value: jest.fn().mockReturnValue(MOCK_MEDIA_QUERY_LIST_INSTANCE),
});

global.confirm = jest.fn(() => true);
