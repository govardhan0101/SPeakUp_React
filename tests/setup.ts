import '@testing-library/jest-dom';
import React from 'react';

// Mock TextEncoder/TextDecoder for Encryption Utils
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock LocalStorage
const localStorageMock = (function() {
  let store: any = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock crypto.randomUUID
Object.defineProperty(global.crypto, 'randomUUID', {
  value: () => 'test-uuid-' + Math.random(),
  writable: true
});
