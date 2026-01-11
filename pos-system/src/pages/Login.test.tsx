import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login'

// Mock Supabase
const mockLogin = vi.fn()
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

// Mock the useAuth hook
vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../contexts/AuthContext')
  return {
    ...actual,
    useAuth: () => ({
      login: mockLogin,
      isAuthenticated: false,
      loading: false,
      user: null,
      session: null,
      logout: vi.fn()
    })
  }
})

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login form', () => {
    render(<Login />)
    
    expect(screen.getByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument()
    expect(screen.getByText('ระบบขายหน้าร้าน')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('อีเมล')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('รหัสผ่าน')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument()
  })

  it('should handle form submission', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue(undefined)
    
    render(<Login />)
    
    const emailInput = screen.getByPlaceholderText('อีเมล')
    const passwordInput = screen.getByPlaceholderText('รหัสผ่าน')
    const submitButton = screen.getByRole('button', { name: 'เข้าสู่ระบบ' })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('should show error message on login failure', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Invalid credentials'
    mockLogin.mockRejectedValue(new Error(errorMessage))
    
    render(<Login />)
    
    const emailInput = screen.getByPlaceholderText('อีเมล')
    const passwordInput = screen.getByPlaceholderText('รหัสผ่าน')
    const submitButton = screen.getByRole('button', { name: 'เข้าสู่ระบบ' })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('should disable form during login', async () => {
    const user = userEvent.setup()
    // Mock a slow login
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<Login />)
    
    const emailInput = screen.getByPlaceholderText('อีเมล')
    const passwordInput = screen.getByPlaceholderText('รหัสผ่าน')
    const submitButton = screen.getByRole('button', { name: 'เข้าสู่ระบบ' })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    // Check that form is disabled during login
    expect(screen.getByText('กำลังเข้าสู่ระบบ...')).toBeInTheDocument()
    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
    expect(submitButton).toBeDisabled()
  })
})