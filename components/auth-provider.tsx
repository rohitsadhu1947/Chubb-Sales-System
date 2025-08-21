"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { logout } from "@/lib/auth-actions"
import { PermissionsProvider } from "@/hooks/use-permissions"

type User = {
  id: string
  username: string
  fullName: string
  email: string
  role: "admin" | "viewer" | "dataentry"
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  logout: async () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const fetchUser = async () => {
    try {
      // Only attempt to fetch user if not on login page
      if (pathname === "/login") {
        setIsLoading(false)
        return
      }

      const res = await fetch("/api/auth/me", {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      })

      // Check if response is JSON
      const contentType = res.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Expected JSON response but got:", contentType)
        setUser(null)
        if (pathname !== "/login") {
          router.push("/login")
        }
        return
      }

      // Parse the JSON response
      const userData = await res.json()

      if (res.ok) {
        setUser(userData)
      } else {
        setUser(null)
        if (pathname !== "/login") {
          router.push("/login")
        }
      }
    } catch (error) {
      console.error("Error fetching user:", error)
      setUser(null)
      if (pathname !== "/login") {
        router.push("/login")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [pathname])

  const handleLogout = async () => {
    await logout()
    setUser(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        logout: handleLogout,
        refreshUser: fetchUser,
      }}
    >
      <PermissionsProvider>{children}</PermissionsProvider>
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
