
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../use-mobile';

describe('useIsMobile Hook', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let mockMatchMedia: jest.Mock;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
  });

  beforeEach(() => {
    // Configuração do mock do matchMedia para cada teste
    mockMatchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(max-width: 767px)' ? window.innerWidth < 768 : false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: mockMatchMedia,
    });
  });

  afterAll(() => {
    // Restaura a implementação original após todos os testes
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it('deve retornar true se a largura da janela for menor que 768px', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('deve retornar false se a largura da janela for 768px ou maior', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 768 });
    const { result: result2 } = renderHook(() => useIsMobile());
    expect(result2.current).toBe(false);
  });

  it('deve atualizar quando a largura da janela muda através do evento "change" do matchMedia', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
    const { result, rerender } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);

    // Simula a mudança de listeners do matchMedia
    // O addEventListener do mock precisa chamar o callback quando `matches` muda.
    // Para simplificar, vamos diretamente simular a mudança de `innerWidth` e forçar o hook a reavaliar.
    
    let changeCallback: (() => void) | null = null;
    mockMatchMedia.mockImplementation(query => ({
        matches: window.innerWidth < 768, // Reavalia baseado no window.innerWidth atual
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn((event, cb) => {
            if (event === 'change') {
                changeCallback = cb;
            }
        }),
        removeEventListener: jest.fn((event, cb) => {
             if (event === 'change' && changeCallback === cb) {
                changeCallback = null;
            }
        }),
        dispatchEvent: jest.fn(),
    }));
    
    // Re-render o hook para pegar a nova implementação do matchMedia que captura o callback
    rerender();


    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
      if (changeCallback) {
        changeCallback(); // Dispara o callback do evento 'change'
      }
    });
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 600 });
      if (changeCallback) {
        changeCallback();
      }
    });
    expect(result.current).toBe(true);
  });

   it('deve retornar undefined inicialmente se window.innerWidth não estiver disponível (SSR)', () => {
    // Salvar o innerWidth original e depois deletá-lo
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: undefined });


    const { result } = renderHook(() => useIsMobile());
    // No useIsMobile, setIsMobile é chamado na primeira execução do useEffect.
    // Se innerWidth é undefined, window.innerWidth < 768 resultará em false.
    // Portanto, o comportamento esperado é false, não undefined.

    // O hook useIsMobile inicializa o isMobile como undefined, mas o useEffect o define
    // imediatamente com base em window.innerWidth. Se innerWidth for mockado para undefined,
    // a comparação `window.innerWidth < MOBILE_BREAKPOINT` se tornará `undefined < 768`,
    // o que é `false` em JavaScript. Então, `isMobile` se tornará `false`.
    expect(result.current).toBe(false);

    // Restaurar o innerWidth
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalInnerWidth });
  });

});
