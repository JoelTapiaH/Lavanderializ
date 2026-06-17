"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/auth"
import {
  LayoutDashboard, Shirt, BarChart3, Receipt, Package,
  Building2, Wallet, Wrench, Users, LogOut,
} from "lucide-react"
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import type { UserRole } from "@/lib/auth"

const allNavItems = [
  { title: "Dashboard",       href: "/",            icon: LayoutDashboard, roles: ["admin","asistente","operador"] as UserRole[] },
  { title: "Tipos de Prenda", href: "/prendas",     icon: Shirt,           roles: ["admin","asistente"] as UserRole[] },
  { title: "Proyectos",       href: "/proyectos",   icon: Building2,       roles: ["admin","asistente"] as UserRole[] },
  { title: "Valorizacion",    href: "/valorizacion",icon: Receipt,         roles: ["admin","asistente"] as UserRole[] },
  { title: "Inventario",      href: "/inventario",  icon: Package,         roles: ["admin","asistente","operador"] as UserRole[] },
  { title: "Planilla",        href: "/planilla",    icon: Wallet,          roles: ["admin"] as UserRole[] },
  { title: "Equipos",         href: "/equipos",     icon: Wrench,          roles: ["admin","asistente","operador"] as UserRole[] },
  { title: "Reportes",        href: "/reportes",    icon: BarChart3,       roles: ["admin","asistente"] as UserRole[] },
  { title: "Usuarios",        href: "/usuarios",    icon: Users,           roles: ["admin"] as UserRole[] },
]

const roleLabel: Record<UserRole, string> = {
  admin: "Administrador",
  asistente: "Asistente",
  operador: "Operador",
}

export function AppSidebar() {
  const pathname = usePathname()
  const { data } = useStore()
  const { profile, signOut } = useAuth()
  const today = new Date().toISOString().split("T")[0]

  const role = profile?.role ?? "operador"
  const navItems = allNavItems.filter((item) => item.roles.includes(role))

  const pendingPayments = role === "admin"
    ? data.payrollPeriods.filter((p) => p.estado === "abierto" && p.endDate && p.endDate < today).length
    : 0

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
            <Image src="/images/logo-liz.png" alt="Lavanderia Liz" fill className="object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
              Lavanderia Liz
            </span>
            <span className="text-[10px] text-sidebar-foreground/60">
              Servicio de Lavado Minero
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-widest">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.href === "/planilla" && pendingPayments > 0 && (
                          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                            {pendingPayments}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-3 space-y-2">
        {profile && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{profile.nombre || profile.email}</p>
              <p className="text-[10px] text-sidebar-foreground/50">{roleLabel[profile.role]}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground"
              title="Cerrar sesión"
              onClick={signOut}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <p className="text-[10px] text-sidebar-foreground/30">Lavanderia Liz v1.0</p>
      </SidebarFooter>
    </Sidebar>
  )
}
