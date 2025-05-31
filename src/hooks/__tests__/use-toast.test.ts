
import { act, renderHook } from '@testing-library/react';
import { useToast, toast as globalToast } from '../use-toast';
// For reducer tests, we'll get the actual reducer and types
import type { State as ActualState, Action as ActualAction, ToasterToast as ActualToasterToast } from '../use-toast';
import { actionTypes as actualActionTypes, reducer as actualReducer } from '../use-toast';


describe('useToast Hook and toast function', () => {
  beforeEach(() => {
    // Reset the internal state of the toast store
    act(() => {
      // Access the actual non-mocked internal state and dispatch for reset
      const { memoryStateRef, originalDispatch } = jest.requireActual('../use-toast');
      if (memoryStateRef.current) {
        memoryStateRef.current.toasts = [];
      } else {
        // This case should ideally not happen if createRef is initialized properly
        memoryStateRef.current = { toasts: [] };
      }
      originalDispatch({ type: 'REMOVE_TOAST' });
    });

    // Verify store is clean at the start of each test
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
      id: '1', // Adjusted to match original genId output (first call in this file)
      title: 'Test Toast 1',
      open: true,
    });
  });

  it('função toast() deve respeitar TOAST_LIMIT', () => {
    // Assuming the internal counter of the original genId increments from the previous test
    // Test 1: globalToast -> id "1"
    // This test:
    //   globalToast -> id "2"
    //   globalToast -> id "3"
    // Final toast in store will have id "3" due to TOAST_LIMIT = 1
    act(() => {
      globalToast({ title: 'Toast A' }); // ID will be "2"
      globalToast({ title: 'Toast B' }); // ID will be "3"
    });
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Toast B');
    expect(result.current.toasts[0].id).toBe('3'); // Adjusted
  });

  it('dismiss() deve marcar o toast como não aberto e agendar para remoção', () => {
    let toastId: string | undefined;
    // Assuming counter is at "4" now
    act(() => {
      const { id } = globalToast({ title: 'Toast para Dispensar' });
      toastId = id; // Expected "4"
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
  });

  it('onOpenChange(false) deve chamar dismiss', () => {
    let toastToChangeId: string = '';
    // Assuming counter is at "5"
    act(() => {
      const { id } = globalToast({ title: 'Toast com onOpenChange' });
      toastToChangeId = id; // Expected "5"
    });

    const { result: hookResult } = renderHook(() => useToast());
    const toastToChange = hookResult.current.toasts.find(t => t.id === toastToChangeId);

    expect(toastToChange).toBeDefined();
    expect(toastToChange?.open).toBe(true);

    act(() => {
      if (toastToChange && toastToChange.onOpenChange) {
        toastToChange.onOpenChange(false);
      }
    });

    const { result: finalResult } = renderHook(() => useToast());
    const changedToast = finalResult.current.toasts.find(t => t.id === toastToChangeId);
    expect(changedToast?.open).toBe(false);
  });

  describe('toast reducer', () => {
    let initialState: ActualState;
    let nextReducerToastId = 1; // For predictable IDs in reducer tests

    beforeEach(() => {
      initialState = { toasts: [] };
      nextReducerToastId = 1; // Reset for each reducer test
    });

    it('ADD_TOAST deve adicionar um toast', () => {
      const toastToAdd: ActualToasterToast = {
        id: (nextReducerToastId++).toString(),
        title: 'Novo',
        open: true,
        onOpenChange: jest.fn(),
      };
      const action: ActualAction = { type: actualActionTypes.ADD_TOAST, toast: toastToAdd };
      const newState = actualReducer(initialState, action);
      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0]).toEqual(toastToAdd);
    });

    it('UPDATE_TOAST deve atualizar um toast existente', () => {
      const toastId = (nextReducerToastId++).toString();
      const toast1: ActualToasterToast = { id: toastId, title: 'Original', open: true, onOpenChange: jest.fn() };
      // For reducer tests, we manage state directly if ADD_TOAST applies TOAST_LIMIT
      const stateWithToast: ActualState = { toasts: [toast1] };

      const updates: Partial<ActualToasterToast> = { title: 'Atualizado', description: 'Desc' };
      const action: ActualAction = { type: actualActionTypes.UPDATE_TOAST, toast: { ...updates, id: toastId } };
      
      const newState = actualReducer(stateWithToast, action);
      expect(newState.toasts[0].title).toBe('Atualizado');
      expect(newState.toasts[0].description).toBe('Desc');
    });

    it('REMOVE_TOAST deve remover um toast específico', () => {
      const toastId1 = (nextReducerToastId++).toString();
      const toastId2 = (nextReducerToastId++).toString();
      const toast1: ActualToasterToast = { id: toastId1, title: 'T1', open: true, onOpenChange: jest.fn() };
      const toast2: ActualToasterToast = { id: toastId2, title: 'T2', open: true, onOpenChange: jest.fn() };
      const directInitialState: ActualState = { toasts: [toast1, toast2] }; // Direct setup

      const action: ActualAction = { type: actualActionTypes.REMOVE_TOAST, toastId: toastId1 };
      const newState = actualReducer(directInitialState, action);
      expect(newState.toasts).toHaveLength(1);
      expect(newState.toasts[0].id).toBe(toastId2);
    });

    it('REMOVE_TOAST sem toastId deve limpar todos os toasts', () => {
      const toast1: ActualToasterToast = { id: (nextReducerToastId++).toString(), title: 'T1', open: true, onOpenChange: jest.fn() };
      const directInitialState: ActualState = { toasts: [toast1] };
      const action: ActualAction = { type: actualActionTypes.REMOVE_TOAST }; // No toastId
      const newState = actualReducer(directInitialState, action);
      expect(newState.toasts).toHaveLength(0);
    });
  });
});
