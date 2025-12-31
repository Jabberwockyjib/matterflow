import '@testing-library/jest-dom'

// Mock ResizeObserver for Radix UI components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock hasPointerCapture for Radix UI Select component
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || function() { return false; };
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function() {};
}
