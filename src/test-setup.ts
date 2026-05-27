import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Stub Clerk so role-gate / chrome tests resolve without a live
// ClerkProvider. Each test re-mocks the publicMetadata.role to exercise
// the role-gate branches.
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    getToken: async () => 'test-jwt',
  }),
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: 'test-user',
      primaryEmailAddress: { emailAddress: 'staff@example.com' },
      publicMetadata: { role: 'owner' },
    },
  }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignIn: () => null,
  SignedIn: ({ children }: { children: React.ReactNode }) => children,
  SignedOut: () => null,
  RedirectToSignIn: () => null,
}))
