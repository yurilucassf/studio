
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../use-mobile';

// Acessa a instância mockada global de MediaQueryList retornada por window.matchMedia
// devido ao mock em jest.setup.js
const mqlInstance = window.matchMedia('(max-width: 767px)');

describe('useIsMobile Hook', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    // Limpar mocks e redefinir valores antes de cada teste
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024, // Padrão para desktop
    });
    // Define o estado 'matches' da instância mockada do MQL
    // O hook usa mql.matches para o estado inicial.
    (mqlInstance as any).matches = window.innerWidth < 768;
    
    // Limpa os mocks dos métodos da instância MQL
    if ((mqlInstance.addEventListener as jest.Mock).mockClear) {
        (mqlInstance.addEventListener as jest.Mock).mockClear();
    }
    if ((mqlInstance.removeEventListener as jest.Mock).mockClear) {
        (mqlInstance.removeEventListener as jest.Mock).mockClear();
    }
    if ((mqlInstance.dispatchEvent as jest.Mock).mockClear) {
        (mqlInstance.dispatchEvent as jest.Mock).mockClear();
    }
    // Limpa o mock da factory window.matchMedia e garante que ele retorne nossa instância mockada
    (window.matchMedia as jest.Mock).mockClear();
    (window.matchMedia as jest.Mock).mockReturnValue(mqlInstance);
  });

  afterEach(() => {
    // Restaura window.innerWidth ao seu valor original após cada teste
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('deve retornar true se a largura da janela for menor que 768px (verificação inicial)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
    (mqlInstance as any).matches = true; 

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('deve retornar false se a largura da janela for 768px ou maior (verificação inicial)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    (mqlInstance as any).matches = false;

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('deve atualizar quando o evento "change" do matchMedia é disparado', () => {
    // Estado inicial: Desktop
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    (mqlInstance as any).matches = false;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Captura o listener registrado pelo hook
    // O useEffect do hook terá sido chamado, então addEventListener já foi invocado.
    const eventListenerCallback = (mqlInstance.addEventListener as jest.Mock).mock.calls[0][1];

    // Simula mudança para mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
      // (mqlInstance as any).matches = true; // O callback do hook recalcula com window.innerWidth
      
      // Chama o callback diretamente para simular o evento sendo processado pelo hook
      if (typeof eventListenerCallback === 'function') {
        eventListenerCallback({ matches: true }); // O argumento do evento pode não ser usado pelo hook, mas é bom passar
      }
    });
    expect(result.current).toBe(true);

    // Simula mudança de volta para desktop
    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
      // (mqlInstance as any).matches = false;
      if (typeof eventListenerCallback === 'function') {
        eventListenerCallback({ matches: false });
      }
    });
    expect(result.current).toBe(false);
  });
  
  it('deve limpar o event listener ao desmontar', () => {
    const { unmount } = renderHook(() => useIsMobile());
    // O useEffect do hook é chamado na montagem, então addEventListener deve ter sido chamado.
    expect(mqlInstance.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(mqlInstance.addEventListener).toHaveBeenCalledTimes(1); // Garante que foi chamado apenas uma vez

    unmount();
    expect(mqlInstance.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(mqlInstance.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
