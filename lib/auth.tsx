"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { supabase } from "./supabase"
import type { User } from "@supabase/supabase-js"

export type UserRole = "admin" | "asistente" | "operador"

export interface UserProfile {
  id: string
  email: string
  nombre: string
  role: UserRole
}

// ── Access matrix ──────────────────────────────────────────────────────────────

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  if (role === "admin") return true
  if (role === "asistente") {
    return !pathname.startsWith("/planilla") &&
           !pathname.startsWith("/usuarios") &&
           !pathname.startsWith("/ordenes/nueva")
  }
  if (role === "operador") {
    return pathname === "/" ||
           pathname.startsWith("/inventario") ||
           pathname.startsWith("/equipos")
  }
  return false
}

export function canEditModule(role: UserRole, module: string): boolean {
  if (role === "admin") return true
  if (role === "asistente") return false
  if (role === "operador") return module === "inventario" || module === "equipos"
  return false
}

export function defaultRouteForRole(role: UserRole): string {
  if (role === "operador") return "/inventario"
  return "/"
}

// ── Context ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchOrCreateProfile(supabaseUser: User) {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", supabaseUser.id)
      .single()

    if (data) {
      setProfile({ id: data.id, email: data.email, nombre: data.nombre ?? "", role: data.role as UserRole })
    } else {
      // Auto-create profile on first login with default role 'operador'
      const newProfile = {
        id: supabaseUser.id,
        email: supabaseUser.email ?? "",
        nombre: supabaseUser.email?.split("@")[0] ?? "",
        role: "operador" as UserRole,
      }
      await supabase.from("user_profiles").insert({
        id: newProfile.id,
        email: newProfile.email,
        nombre: newProfile.nombre,
        role: newProfile.role,
      })
      setProfile(newProfile)
    }
  }

  useEffect(() => {
    // Safety timeout — never stay blank forever
    const timeout = setTimeout(() => {
      console.warn("Auth timeout — forcing loading=false")
      setLoading(false)
    }, 6000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      setUser(session?.user ?? null)
      if (session?.user) {
        try { await fetchOrCreateProfile(session.user) } catch (e) { console.error("profile error:", e) }
      }
      setLoading(false)
    }).catch((e) => {
      clearTimeout(timeout)
      console.error("getSession error:", e)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        try { await fetchOrCreateProfile(session.user) } catch (e) { console.error("profile error:", e) }
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
