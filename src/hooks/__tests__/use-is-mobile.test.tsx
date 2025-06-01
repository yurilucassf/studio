
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../use-mobile';

// Acessa a instância mockada global de MediaQueryList retornada por window.matchMedia
// devido ao mock em jest.setup.js
const mqlInstance = window.matchMedia('(max-width: 767px)');

describe('useIsMobile Hook', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    // Restaura window.innerWidth para um valor padrão antes de cada teste
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024, // Padrão para desktop
    });
    // Define o estado 'matches' da instância mockada do MQL
    (mqlInstance as any).matches = window.innerWidth < 768;
    
    // Limpa os mocks dos métodos da instância MQL para evitar interferência entre testes
    if ((mqlInstance.addEventListener as jest.Mock).mockClear) {
        (mqlInstance.addEventListener as jest.Mock).mockClear();
    }
    if ((mqlInstance.removeEventListener as jest.Mock).mockClear) {
        (mqlInstance.removeEventListener as jest.Mock).mockClear();
    }
    if ((mqlInstance.dispatchEvent as jest.Mock).mockClear) {
      // Se dispatchEvent não for um jest.Mock, não precisa limpar,
      // mas se for (como no setup aprimorado), limpe-o.
    }
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
    (mqlInstance as any).matches = true; // O hook usa window.innerWidth, mas é bom manter mql.matches consistente

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

    // Simula mudança para mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
      (mqlInstance as any).matches = true; // Importante: o listener do hook usará window.innerWidth, mas mql.matches deve refletir o estado para consistência do evento
      
      // Dispara o evento 'change'. O mock de dispatchEvent em jest.setup.js chamará os listeners.
      mqlInstance.dispatchEvent(new Event('change'));
    });
    expect(result.current).toBe(true);

    // Simula mudança de volta para desktop
    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });
      (mqlInstance as any).matches = false;
      mqlInstance.dispatchEvent(new Event('change'));
    });
    expect(result.current).toBe(false);
  });
  
  it('deve limpar o event listener ao desmontar', () => {
    const { unmount } = renderHook(() => useIsMobile());
    expect(mqlInstance.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    unmount();
    expect(mqlInstance.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
