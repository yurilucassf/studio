"use client"

import * as React from "react" // Necessário para React.useRef
import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

// Exportar para uso no teste do reducer, se necessário
export const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

// Exportar para mock no teste
export function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

// Exportar para uso no teste do reducer
export type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

// Exportar para uso no teste do reducer
export interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

// Mudar memoryState para ser uma referência exportável
export const memoryStateRef = React.createRef<State>()
// Inicializa o current da ref. Isso é feito uma vez quando o módulo é carregado.
if (!memoryStateRef.current) {
  memoryStateRef.current = { toasts: [] };
}


const listeners: Array<(state: State) => void> = []

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    originalDispatch({ // Usar originalDispatch
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action
      if (toastId) {
        addToRemoveQueue(toastId)
      } else if (state.toasts.length > 0) { // Adicionado verificação para evitar erro se toasts for vazio
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

// Exportar dispatch como originalDispatch para testes
export function originalDispatch(action: Action) {
  if (memoryStateRef.current) { // Verificar se current não é null
    memoryStateRef.current = reducer(memoryStateRef.current, action);
    listeners.forEach((listener) => {
      if (memoryStateRef.current) { // Verificar novamente
        listener(memoryStateRef.current);
      }
    });
  }
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (updatedProps: ToasterToast) => // Corrigido nome do parâmetro
    originalDispatch({
      type: "UPDATE_TOAST",
      toast: { ...updatedProps, id }, // Usar updatedProps
    })
  const dismiss = () => originalDispatch({ type: "DISMISS_TOAST", toastId: id })

  originalDispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  // Certificar que memoryStateRef.current existe ao inicializar o estado
  const [state, setState] = React.useState<State>(memoryStateRef.current ?? { toasts: [] });

  React.useEffect(() => {
    // Se o estado no hook estiver dessincronizado com a ref global (ex: HMR ou reset no teste), atualize-o.
    if (memoryStateRef.current && state !== memoryStateRef.current) {
        setState(memoryStateRef.current);
    }

    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []); // Dependência vazia para registrar/remover listener apenas uma vez

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => originalDispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
