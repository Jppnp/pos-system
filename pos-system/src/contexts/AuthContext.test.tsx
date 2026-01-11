import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null })
    }
  }
}))

// Mock IndexedDB
Object.defineProperty(window, 'indexedDB', {
  value: {
    databases: vi.fn().mockResolvedValue([]),
    deleteDatabase: vi.fn().mockReturnValue({
      onsuccess: null,
      onerror: null
    })
  }
})

// Test component that uses the auth context
function TestComponent() {
  const { isAuthenticated, loading, user } = useAuth()
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      <div data-testid="user-email">
        {user?.email || 'No user'}
      </div>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should provide authentication context', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for loading to complete
    await screen.findByTestId('auth-status')
    expect(screen.getByTestId('auth-status')).toBeInTheDocument()
    expect(screen.getByTestId('user-email')).toBeInTheDocument()
  })

  it('should show not authenticated when no user', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for loading to complete
    await screen.findByText('Not Authenticated')
    expect(screen.getByText('No user')).toBeInTheDocument()
  })

  it('should throw error when useAuth is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')
    
    consoleSpy.mockRestore()
  })
})