
import '@testing-library/jest-dom';

// You can add other global setup here, e.g., mocking global objects or functions
// For example, to mock Firebase globally (very basic example):
/*
jest.mock('@/lib/firebase', () => ({
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
        set: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
      })),
      add: jest.fn(() => Promise.resolve({ id: 'mocked-doc-id' })),
      where: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ docs: [], empty: true, size: 0 })),
      })),
      orderBy: jest.fn(() => ({
        limit: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ docs: [], empty: true, size: 0 })),
        })),
        get: jest.fn(() => Promise.resolve({ docs: [], empty: true, size: 0 })),
      })),
      limit: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ docs: [], empty: true, size: 0 })),
      })),
      get: jest.fn(() => Promise.resolve({ docs: [], empty: true, size: 0 })),
    })),
    doc: jest.fn((db, path, id) => ({
        get: jest.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
        set: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
    })),
    Timestamp: {
        now: jest.fn(() => ({ toMillis: () => Date.now() })),
        fromMillis: jest.fn((ms) => ({ toMillis: () => ms })),
    },
    writeBatch: jest.fn(() => ({
        delete: jest.fn(),
        commit: jest.fn(() => Promise.resolve()),
    })),
  },
  auth: {
    // Mock auth functions as needed
    onAuthStateChanged: jest.fn(() => jest.fn()), // Returns an unsubscribe function
    signInWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'mock-uid' } })),
    createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'mock-new-uid' } })),
    signOut: jest.fn(() => Promise.resolve()),
  },
}));

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

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));
*/

// If you need to mock specific window properties, like matchMedia for useIsMobile hook:
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock console.error to avoid cluttering test output, but still fail tests on error
// const originalError = console.error;
// beforeAll(() => {
//   jest.spyOn(console, 'error').mockImplementation((...args) => {
//     // You can check for specific error messages to ignore or handle differently
//     originalError(...args); // Optionally call original error
//     // throw new Error('Console error detected in test: ' + args.join(' ')); // Make tests fail on console.error
//   });
// });
// afterAll(() => {
//   (console.error as jest.Mock).mockRestore();
// });

global.confirm = jest.fn(() => true); // Auto-confirm any confirm dialogs
