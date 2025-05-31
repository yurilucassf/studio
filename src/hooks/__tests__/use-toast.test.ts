
import { act, renderHook } from '@testing-library/react';
import { useToast, toast as globalToast, reducer, Action, ActionType, State, genId as actualGenId } from '../use-toast'; // Importar reducer e tipos

// Mock para genId para ter IDs previsíveis nos testes
let mockToastIdCounter = 0;
jest.mock('../use-toast', () => {
  const originalModule = jest.requireActual('../use-toast');
  return {
    ...originalModule,
    genId: () => `test-toast-id-${mockToastIdCounter++}`,
  };
});


describe('useToast Hook and toast function', () => {
  beforeEach(() => {
    // Resetar o estado do hook e o contador de ID antes de cada teste
    mockToastIdCounter = 0;
    act(() => {
      // Limpa os toasts diretamente no memoryState, que é o que o hook lê
      const { toasts } = useToast.getState();
      toasts.forEach(t => useToast.getState().dismiss(t.id));
       // Dispara REMOVE_TOAST para todos para garantir que a fila seja limpa.
      originalModule.dispatch({ type: 'REMOVE_TOAST' });
    });
     // Garante que o memoryState esteja limpo
     const { result: stateResult } = renderHook(() => useToast());
     expect(stateResult.current.toasts).toEqual([]);
  });

  it('useToast deve retornar um array de toasts vazio inicialmente', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('função toast() deve adicionar um toast ao estado global', () => {
    act(() => {
      globalToast({ title: 'Test Toast 1' });
    });
    
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      id: 'test-toast-id-0',
      title: 'Test Toast 1',
      open: true,
    });
  });

  it('função toast() deve respeitar TOAST_LIMIT', () => {
     act(() => {
      globalToast({ title: 'Toast 1' });
      globalToast({ title: 'Toast 2' }); // TOAST_LIMIT é 1, então este deve substituir o anterior
    });
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Toast 2'); // O último adicionado deve ser o visível
  });


  it('dismiss() deve marcar o toast como não aberto e agendar para remoção', () => {
    let toastId: string | undefined;
    act(() => {
      const { id } = globalToast({ title: 'Toast para Dispensar' });
      toastId = id;
    });

    const { result: stateBeforeDismiss } = renderHook(() => useToast());
    expect(stateBeforeDismiss.current.toasts[0].open).toBe(true);
    
    act(() => {
      if (toastId) {
        stateBeforeDismiss.current.dismiss(toastId);
      }
    });
    
    const { result: stateAfterDismiss } = renderHook(() => useToast());
    expect(stateAfterDismiss.current.toasts[0].open).toBe(false);
    // A remoção real é atrasada, então o toast ainda está na lista mas com open: false
  });

  it('onOpenChange(false) deve chamar dismiss', () => {
    const { result: initialResult } = renderHook(() => useToast());
    const dismissSpy = jest.spyOn(initialResult.current, 'dismiss');
    
    act(() => {
      globalToast({ title: 'Toast com onOpenChange' });
    });

    const { result: updatedResult } = renderHook(() => useToast());
    const toastToChange = updatedResult.current.toasts[0];

    act(() => {
      if (toastToChange.onOpenChange) {
        toastToChange.onOpenChange(false);
      }
    });
    expect(dismissSpy).toHaveBeenCalledWith(toastToChange.id);
    dismissSpy.mockRestore();
  });

  describe('toast reducer', () => {
    let initialState: State;

    beforeEach(() => {
      initialState = { toasts: [] };
      mockToastIdCounter = 0; // Resetar para IDs previsíveis
    });

    it('ADD_TOAST deve adicionar um toast', () => {
      const toastToAdd = { id: 'test-toast-id-0', title: 'Novo', open: true, onOpenChange: jest.fn() };
      const action: Action = { type: 'ADD_TOAST', toast: toastToAdd };
      const newState = reducer(initialState, action);
      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0]).toEqual(toastToAdd);
    });

    it('UPDATE_TOAST deve atualizar um toast existente', () => {
      const toast1 = { id: 'test-toast-id-0', title: 'Original', open: true, onOpenChange: jest.fn() };
      initialState = { toasts: [toast1] };
      const updates: Partial<typeof toast1> = { title: 'Atualizado', description: 'Desc' };
      const action: Action = { type: 'UPDATE_TOAST', toast: { ...updates, id: 'test-toast-id-0' } };
      const newState = reducer(initialState, action);
      expect(newState.toasts[0].title).toBe('Atualizado');
      expect(newState.toasts[0].description).toBe('Desc');
    });

    it('REMOVE_TOAST deve remover um toast específico', () => {
      const toast1 = { id: 'test-toast-id-0', title: 'T1', open: true, onOpenChange: jest.fn() };
      const toast2 = { id: 'test-toast-id-1', title: 'T2', open: true, onOpenChange: jest.fn() };
      initialState = { toasts: [toast1, toast2] };
      const action: Action = { type: 'REMOVE_TOAST', toastId: 'test-toast-id-0' };
      const newState = reducer(initialState, action);
      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0].id).toBe('test-toast-id-1');
    });
    
    it('REMOVE_TOAST sem toastId deve limpar todos os toasts', () => {
      const toast1 = { id: 'test-toast-id-0', title: 'T1', open: true, onOpenChange: jest.fn() };
      initialState = { toasts: [toast1] };
      const action: Action = { type: 'REMOVE_TOAST' };
      const newState = reducer(initialState, action);
      expect(newState.toasts).toHaveLength(0);
    });
  });
});
