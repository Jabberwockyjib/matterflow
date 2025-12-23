import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * AllProviders wraps components with all necessary context providers.
 * Add providers here as the application grows (e.g., QueryClientProvider, AuthProvider).
 */
function AllProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/**
 * Custom render function that wraps the component with all necessary providers.
 * Use this instead of importing render directly from @testing-library/react.
 *
 * @example
 * ```tsx
 * import { renderWithProviders, screen } from '@/tests/setup/test-utils'
 *
 * test('renders component', () => {
 *   renderWithProviders(<MyComponent />)
 *   expect(screen.getByRole('button')).toBeInTheDocument()
 * })
 * ```
 */
function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  }
}

/**
 * Custom render with user event already set up.
 * Convenient shorthand for most test cases.
 *
 * @example
 * ```tsx
 * import { renderWithUser, screen } from '@/tests/setup/test-utils'
 *
 * test('user can click button', async () => {
 *   const { user } = renderWithUser(<MyButton />)
 *   await user.click(screen.getByRole('button'))
 * })
 * ```
 */
function renderWithUser(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return renderWithProviders(ui, options)
}

// Re-export everything from testing-library/react
export * from '@testing-library/react'

// Export custom render functions
export { renderWithProviders, renderWithUser, AllProviders }

// Export userEvent for direct usage
export { userEvent }
