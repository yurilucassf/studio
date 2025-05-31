import { act, renderHook } from '@testing-library/react';
// Importar os itens necessários do módulo original, incluindo os exportados para teste
import {
  useToast,
  toast as globalToast,
  reducer,
  type Action,
  type State,
  originalDispatch, // Importar o dispatch original
  memoryStateRef,   // Importar a referência ao estado
} from '../use-toast'; // Ajustado para '../use-toast' se estiver na mesma pasta __tests__

// Mock para genId para ter IDs previsíveis nos testes
let mockToastIdCounter = 0;

// Mockear apenas a função genId do módulo
jest.mock('../use-toast', () => {
  const originalModule = jest.requireActual('../use-toast');
  return {
    ...originalModule, // Mantém todas as outras exportações originais
    genId: () => `test-toast-id-${mockToastIdCounter++}`,
  };
});


describe('useToast Hook and toast function', () => {
  beforeEach(() => {
    mockToastIdCounter = 0; // Resetar o contador para cada teste
    act(() => {
      // Reseta o estado do 'memoryStateRef.current' diretamente antes de cada teste
      if (memoryStateRef && memoryStateRef.current) {
        memoryStateRef.current.toasts = [];
      }
      // Dispara REMOVE_TOAST para limpar completamente e notificar listeners (se houver)
      // Certifique-se de que originalDispatch está disponível e é o dispatch do módulo real
      const { originalDispatch: actualDispatch } = jest.requireActual('../use-toast');
      actualDispatch({ type: 'REMOVE_TOAST' });
    });

    // Verifica se o estado está limpo no início de cada teste usando o hook
    // É importante que o renderHook use a versão não mockada (ou parcialmente mockada) de useToast
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
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
      id: 'test-toast-id-0', // Primeiro ID gerado pelo mock
      title: 'Test Toast 1',
      open: true,
    });
  });

  it('função toast() deve respeitar TOAST_LIMIT', () => {
    act(() => {
      globalToast({ title: 'Toast 1' });
      // Supondo TOAST_LIMIT = 1, este substituirá o anterior.
      globalToast({ title: 'Toast 2' });
    });
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Toast 2');
  });

  it('dismiss() deve marcar o toast como não aberto e agendar para remoção', () => {
    let toastId: string | undefined;
    act(() => {
      const { id } = globalToast({ title: 'Toast para Dispensar' });
      toastId = id;
    });

    const { result: stateBeforeDismiss } = renderHook(() => useToast());
    expect(stateBeforeDismiss.current.toasts.find(t => t.id === toastId)?.open).toBe(true);

    act(() => {
      if (toastId) {
        stateBeforeDismiss.current.dismiss(toastId);
      }
    });

    const { result: stateAfterDismiss } = renderHook(() => useToast());
    expect(stateAfterDismiss.current.toasts.find(t => t.id === toastId)?.open).toBe(false);
    // A remoção real é atrasada, o toast ainda está na lista mas com open: false
  });

  it('onOpenChange(false) deve chamar dismiss e fechar o toast', () => {
    let toastToChangeId: string = '';
    act(() => {
      const { id } = globalToast({ title: 'Toast com onOpenChange' });
      toastToChangeId = id;
    });

    const { result: updatedResult } = renderHook(() => useToast());
    const toastToChange = updatedResult.current.toasts.find(t => t.id === toastToChangeId);

    expect(toastToChange).toBeDefined();
    expect(toastToChange?.open).toBe(true);

    act(() => {
      if (toastToChange && toastToChange.onOpenChange) {
        toastToChange.onOpenChange(false); // Isso deve acionar o dismiss interno
      }
    });

    const { result: finalResult } = renderHook(() => useToast());
    const changedToast = finalResult.current.toasts.find(t => t.id === toastToChangeId);
    expect(changedToast?.open).toBe(false); // Verifica o efeito do dismiss
  });

  describe('toast reducer', () => {
    let initialState: State;

    beforeEach(() => {
      initialState = { toasts: [] };
      // Resetar mockToastIdCounter para o reducer também, se genId for usado diretamente lá
      // (normalmente não é, id é passado na action)
      mockToastIdCounter = 0;
    });

    it('ADD_TOAST deve adicionar um toast', () => {
      // Usar o ID gerado pelo mock para consistência se o reducer não gerar IDs
      const toastToAdd = { id: `test-toast-id-${mockToastIdCounter++}`, title: 'Novo', open: true, onOpenChange: jest.fn() };
      const action: Action = { type: 'ADD_TOAST', toast: toastToAdd };
      const newState = reducer(initialState, action);
      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0]).toEqual(toastToAdd);
    });

    it('UPDATE_TOAST deve atualizar um toast existente', () => {
      const toastId = `test-toast-id-${mockToastIdCounter++}`;
      const toast1 = { id: toastId, title: 'Original', open: true, onOpenChange: jest.fn() };
      initialState = { toasts: [toast1] };
      const updates: Partial<typeof toast1> = { title: 'Atualizado', description: 'Desc' };
      const action: Action = { type: 'UPDATE_TOAST', toast: { ...updates, id: toastId } };
      const newState = reducer(initialState, action);
      expect(newState.toasts[0].title).toBe('Atualizado');
      expect(newState.toasts[0].description).toBe('Desc');
    });

    it('REMOVE_TOAST deve remover um toast específico', () => {
      const toastId1 = `test-toast-id-${mockToastIdCounter++}`;
      const toastId2 = `test-toast-id-${mockToastIdCounter++}`;
      const toast1 = { id: toastId1, title: 'T1', open: true, onOpenChange: jest.fn() };
      const toast2 = { id: toastId2, title: 'T2', open: true, onOpenChange: jest.fn() };
      initialState = { toasts: [toast1, toast2] };
      const action: Action = { type: 'REMOVE_TOAST', toastId: toastId1 };
      const newState = reducer(initialState, action);
      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0].id).toBe(toastId2);
    });

    it('REMOVE_TOAST sem toastId deve limpar todos os toasts', () => {
      const toast1 = { id: `test-toast-id-${mockToastIdCounter++}`, title: 'T1', open: true, onOpenChange: jest.fn() };
      initialState = { toasts: [toast1] };
      const action: Action = { type: 'REMOVE_TOAST' }; // Sem toastId
      const newState = reducer(initialState, action);
      expect(newState.toasts).toHaveLength(0);
    });
  });
});
