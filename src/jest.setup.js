
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

// Mock useToast globalmente para evitar erros em componentes que o utilizam e não são o foco do teste.
// Testes específicos para useToast devem usar jest.requireActual ou mocks mais detalhados.
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
  // Adicionar o export 'toast' se ele for importado diretamente em algum lugar
  toast: jest.fn(),
}));


// Mock para window.matchMedia mais controlável para useIsMobile.test.tsx
const MOCK_MEDIA_QUERY_LIST_INSTANCE = {
  matches: false, // Default value, can be changed by tests
  media: '(max-width: 767px)',
  onchange: null,
  addListener: jest.fn(), // deprecated
  removeListener: jest.fn(), // deprecated
  eventListeners: new Map<string, jest.MockedFunction<any>>(),
  addEventListener(event: string, cb: any) {
    this.eventListeners.set(event, cb);
  },
  removeEventListener(event: string) {
    this.eventListeners.delete(event);
  },
  dispatchEvent(event: Event) {
    if (this.eventListeners.has(event.type)) {
      // Pass the MQL object itself (or an event object mimicking it) to the listener
      this.eventListeners.get(event.type)?.({ matches: this.matches, media: this.media });
      return true;
    }
    return false;
  },
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true, // Crucial para permitir que testes ajustem o mock se necessário (embora agora o objetivo seja não redefinir)
  value: jest.fn().mockReturnValue(MOCK_MEDIA_QUERY_LIST_INSTANCE),
});

global.confirm = jest.fn(() => true);
