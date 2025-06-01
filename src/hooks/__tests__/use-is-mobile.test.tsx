
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../use-mobile';

describe('useIsMobile Hook', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let currentEventListeners: Map<string, jest.MockedFunction<any>>;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterAll(() => {
    // Restaura a implementação original após todos os testes
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  // Função auxiliar para configurar o mock do matchMedia para cada teste
  const mockMatchMediaImplementation = (matchesValue: boolean) => {
    currentEventListeners = new Map();
    const mockMediaQueryList = {
      matches: matchesValue,
      media: '(max-width: 767px)',
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn((event: string, cb: any) => {
        currentEventListeners.set(event, cb);
      }),
      removeEventListener: jest.fn((event: string) => {
        currentEventListeners.delete(event);
      }),
      dispatchEvent: jest.fn((event: Event) => {
        if (currentEventListeners.has(event.type)) {
          currentEventListeners.get(event.type)?.();
          return true;
        }
        return false;
      }),
    };

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation(() => mockMediaQueryList),
    });
    return mockMediaQueryList;
  };


  it('deve retornar true se a largura da janela for menor que 768px', () => {
    mockMatchMediaImplementation(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('deve retornar false se a largura da janela for 768px ou maior', () => {
    mockMatchMediaImplementation(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('deve atualizar quando o valor de matches do matchMedia muda', () => {
    const mql = mockMatchMediaImplementation(true); // Começa como mobile (matches: true)
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);

    act(() => {
      // Simula a mudança de 'matches' para false (desktop)
      mql.matches = false;
      // Dispara o listener de mudança que o hook useIsMobile registrou
      const changeListener = currentEventListeners.get('change');
      if (changeListener) {
        changeListener();
      }
    });
    
    expect(result.current).toBe(false);

    act(() => {
      // Simula a mudança de 'matches' de volta para true (mobile)
      mql.matches = true;
      const changeListener = currentEventListeners.get('change');
      if (changeListener) {
        changeListener();
      }
    });
    expect(result.current).toBe(true);
  });

  it('deve retornar false inicialmente se window.innerWidth não estiver disponível (SSR) ou matches for false', () => {
    // O hook `useIsMobile` usa `window.innerWidth` no `useEffect` inicial.
    // O mock de `matchMedia` também influencia. Se `matches` for `false`, o estado será `false`.
    mockMatchMediaImplementation(false); // matches: false
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 }); // Simula desktop
    
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });
});
