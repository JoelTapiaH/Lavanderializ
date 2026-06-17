"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import type { UserRole } from "@/lib/auth"
import { toast } from "sonner"
import { Users, Shield, User as UserIcon, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Profile {
  id: string
  email: string
  nombre: string
  role: UserRole
  created_at: string
}

const roleBadge: Record<UserRole, { label: string; className: string }> = {
  admin:    { label: "Administrador", className: "bg-purple-100 text-purple-800 border-purple-200" },
  asistente:{ label: "Asistente",    className: "bg-blue-100 text-blue-800 border-blue-200" },
  operador: { label: "Operador",     className: "bg-slate-100 text-slate-700 border-slate-200" },
}

export default function UsuariosPage() {
  const { profile: me } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Profile | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editRole, setEditRole] = useState<UserRole>("operador")
  const [saving, setSaving] = useState(false)

  async function loadProfiles() {
    setLoading(true)
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: true })
    if (error) {
      toast.error("Error cargando usuarios")
    } else {
      setProfiles(data as Profile[])
    }
    setLoading(false)
  }

  useEffect(() => { loadProfiles() }, [])

  function openEdit(p: Profile) {
    setEditTarget(p)
    setEditNombre(p.nombre)
    setEditRole(p.role)
  }

  async function saveEdit() {
    if (!editTarget) return
    setSaving(true)
    const { error } = await supabase
      .from("user_profiles")
      .update({ nombre: editNombre.trim(), role: editRole })
      .eq("id", editTarget.id)
    setSaving(false)
    if (error) {
      toast.error("Error guardando cambios")
    } else {
      toast.success("Usuario actualizado")
      setEditTarget(null)
      loadProfiles()
    }
  }

  const adminCount = profiles.filter((p) => p.role === "admin").length
  const asistenteCount = profiles.filter((p) => p.role === "asistente").length
  const operadorCount = profiles.filter((p) => p.role === "operador").length

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
          <p className="text-sm text-muted-foreground">Administra roles y permisos del equipo</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{adminCount}</p>
                <p className="text-xs text-muted-foreground">Administradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <UserIcon className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{asistenteCount}</p>
                <p className="text-xs text-muted-foreground">Asistentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <UserIcon className="h-8 w-8 text-slate-400" />
              <div>
                <p className="text-2xl font-bold">{operadorCount}</p>
                <p className="text-xs text-muted-foreground">Operadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Todos los usuarios</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : profiles.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No hay usuarios registrados</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => {
                  const rb = roleBadge[p.role]
                  const isMe = p.id === me?.id
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.nombre || "—"}
                        {isMe && (
                          <span className="ml-2 text-[10px] text-muted-foreground">(tú)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{p.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={rb.className}>{rb.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("es-PE", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Permisos reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Matriz de permisos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                <TableHead className="text-center">Administrador</TableHead>
                <TableHead className="text-center">Asistente</TableHead>
                <TableHead className="text-center">Operador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["Dashboard",      "✅ Ver + Editar", "✅ Ver",          "✅ Ver"],
                ["Prendas",        "✅ Ver + Editar", "✅ Ver",          "❌ Sin acceso"],
                ["Proyectos",      "✅ Ver + Editar", "✅ Ver",          "❌ Sin acceso"],
                ["Valorización",   "✅ Ver + Editar", "✅ Ver",          "❌ Sin acceso"],
                ["Inventario",     "✅ Ver + Editar", "✅ Ver",          "✅ Ver + Editar"],
                ["Planilla",       "✅ Ver + Editar", "❌ Sin acceso",   "❌ Sin acceso"],
                ["Equipos",        "✅ Ver + Editar", "✅ Ver",          "✅ Ver + Editar"],
                ["Reportes",       "✅ Ver + Editar", "✅ Ver",          "❌ Sin acceso"],
                ["Usuarios",       "✅ Ver + Editar", "❌ Sin acceso",   "❌ Sin acceso"],
              ].map(([mod, admin, asist, oper]) => (
                <TableRow key={mod}>
                  <TableCell className="font-medium text-sm">{mod}</TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">{admin}</TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">{asist}</TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">{oper}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Correo</Label>
              <Input value={editTarget?.email ?? ""} disabled className="text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                placeholder="Nombre del usuario"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="asistente">Asistente</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
