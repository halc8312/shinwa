import { useSession } from 'next-auth/react'

export function useCurrentUser() {
  const { data: session, status } = useSession()
  
  return {
    user: session?.user,
    userId: session?.user?.id,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated'
  }
}