"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  UsersRound,
  Shirt,
  BarChart3,
  Receipt,
  Package,
  Building2,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Ordenes", href: "/ordenes", icon: ClipboardList },
  { title: "Cuadrillas", href: "/grupos", icon: UsersRound },
  { title: "Mineros", href: "/mineros", icon: Users },
  { title: "Tipos de Prenda", href: "/prendas", icon: Shirt },
  { title: "Proyectos", href: "/proyectos", icon: Building2 },
  { title: "Valorizacion", href: "/valorizacion", icon: Receipt },
  { title: "Inventario", href: "/inventario", icon: Package },
  { title: "Reportes", href: "/reportes", icon: BarChart3 },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
            <Image
              src="/images/logo-liz.png"
              alt="Lavanderia Liz"
              fill
              className="object-cover"
            />
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
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-4 py-3">
        <p className="text-[10px] text-sidebar-foreground/40">
          Lavanderia Liz v1.0
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
