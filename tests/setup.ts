import '@testing-library/jest-dom';

// Mock vis-network to avoid DOM issues in tests
vi.mock('vis-network', () => ({
  Network: vi.fn(() => ({
    on: vi.fn(),
    setOptions: vi.fn(),
    fit: vi.fn(),
    focus: vi.fn(),
    destroy: vi.fn(),
    redraw: vi.fn(),
    stabilize: vi.fn(),
    getPositions: vi.fn(() => ({})),
  })),
  DataSet: vi.fn(() => ({
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    get: vi.fn(() => []),
  })),
}));
