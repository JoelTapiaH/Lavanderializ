"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, canAccessRoute, defaultRouteForRole } from "@/lib/auth"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Loader2 } from "lucide-react"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const isLoginPage = pathname === "/login"

  useEffect(() => {
    if (loading) return

    if (!user) {
      if (!isLoginPage) router.replace("/login")
      return
    }

    // Logged in but on login page → go to app
    if (isLoginPage) {
      router.replace(profile ? defaultRouteForRole(profile.role) : "/")
      return
    }

    // Check route access
    if (profile && !canAccessRoute(profile.role, pathname)) {
      router.replace(defaultRouteForRole(profile.role))
    }
  }, [loading, user, profile, pathname, isLoginPage, router])

  const spinner = (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  if (loading) return spinner

  // Login page renders without sidebar
  if (isLoginPage) {
    return <>{children}</>
  }

  // Not authenticated yet — redirect is pending, show spinner instead of app pages
  if (!user) return spinner

  // Authenticated: render with sidebar
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
