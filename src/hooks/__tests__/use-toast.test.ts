
import { act, renderHook } from '@testing-library/react';
// Importar as funções que queremos testar diretamente e o módulo como um todo para espionagem
import { useToast, toast as globalToast, reducer } from '../use-toast';
import * as toastModule from '../use-toast'; // Para espionar genId e acessar exports internos

// Counter para nossos IDs mockados
let mockToastIdCounter = 0;

// Espionar e mockar a função genId do módulo real
// Isso deve ser feito no nível superior, antes de qualquer describe ou test
jest.spyOn(toastModule, 'genId').mockImplementation(() => `test-toast-id-${mockToastIdCounter++}`);

describe('useToast Hook and toast function', () => {
  beforeEach(() => {
    mockToastIdCounter = 0; // Resetar o contador para IDs previsíveis em cada teste

    // Reseta o estado do 'memoryStateRef.current' diretamente antes de cada teste
    // e notifica os listeners.
    act(() => {
      // Usar as exportações reais do módulo que estamos testando/espionando
      const { memoryStateRef, originalDispatch } = toastModule;
      if (memoryStateRef && memoryStateRef.current) {
        memoryStateRef.current.toasts = []; // Reseta o array de toasts
      }
      // Dispara REMOVE_TOAST para limpar completamente e notificar listeners
      originalDispatch({ type: 'REMOVE_TOAST' });
    });

    // Verifica se o estado está limpo no início de cada teste usando o hook
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
    // TOAST_LIMIT é 1 no use-toast.ts
    act(() => {
      globalToast({ title: 'Toast 1' }); // ID: test-toast-id-0
      globalToast({ title: 'Toast 2' }); // ID: test-toast-id-1, deve substituir o anterior
    });
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Toast 2');
    expect(result.current.toasts[0].id).toBe('test-toast-id-1');
  });

  it('dismiss() deve marcar o toast como não aberto e agendar para remoção', () => {
    let toastId: string | undefined;
    act(() => {
      const { id } = globalToast({ title: 'Toast para Dispensar' });
      toastId = id; // test-toast-id-0
    });

    const { result: hookResult } = renderHook(() => useToast());
    expect(hookResult.current.toasts.find(t => t.id === toastId)?.open).toBe(true);

    act(() => {
      if (toastId) {
        hookResult.current.dismiss(toastId);
      }
    });

    const { result: stateAfterDismiss } = renderHook(() => useToast());
    const dismissedToast = stateAfterDismiss.current.toasts.find(t => t.id === toastId);
    expect(dismissedToast).toBeDefined();
    expect(dismissedToast?.open).toBe(false);
    // A remoção real é atrasada (TOAST_REMOVE_DELAY), o toast ainda está na lista mas com open: false
  });

  it('onOpenChange(false) deve chamar dismiss e fechar o toast', () => {
    let toastToChangeId: string = '';
    act(() => {
      const { id } = globalToast({ title: 'Toast com onOpenChange' });
      toastToChangeId = id; // test-toast-id-0
    });

    const { result: hookResult } = renderHook(() => useToast());
    const toastToChange = hookResult.current.toasts.find(t => t.id === toastToChangeId);

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
    let initialState: toastModule.State;

    beforeEach(() => {
      initialState = { toasts: [] };
      // mockToastIdCounter já é resetado no beforeEach externo.
    });

    it('ADD_TOAST deve adicionar um toast', () => {
      const toastToAdd = { id: `test-toast-id-${mockToastIdCounter++}`, title: 'Novo', open: true, onOpenChange: jest.fn() };
      const action: toastModule.Action = { type: 'ADD_TOAST', toast: toastToAdd };
      const newState = reducer(initialState, action);
      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0]).toEqual(toastToAdd);
    });

    it('UPDATE_TOAST deve atualizar um toast existente', () => {
      const toastId = `test-toast-id-${mockToastIdCounter++}`;
      const toast1 = { id: toastId, title: 'Original', open: true, onOpenChange: jest.fn() };
      initialState = { toasts: [toast1] };
      const updates: Partial<typeof toast1> = { title: 'Atualizado', description: 'Desc' };
      const action: toastModule.Action = { type: 'UPDATE_TOAST', toast: { ...updates, id: toastId } };
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
      const action: toastModule.Action = { type: 'REMOVE_TOAST', toastId: toastId1 };
      const newState = reducer(initialState, action);
      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0].id).toBe(toastId2);
    });

    it('REMOVE_TOAST sem toastId deve limpar todos os toasts', () => {
      const toast1 = { id: `test-toast-id-${mockToastIdCounter++}`, title: 'T1', open: true, onOpenChange: jest.fn() };
      initialState = { toasts: [toast1] };
      const action: toastModule.Action = { type: 'REMOVE_TOAST' }; // Sem toastId
      const newState = reducer(initialState, action);
      expect(newState.toasts).toHaveLength(0);
    });
  });
});
