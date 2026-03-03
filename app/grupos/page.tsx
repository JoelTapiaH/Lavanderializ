"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, UsersRound } from "lucide-react"
import { toast } from "sonner"

export default function GruposPage() {
  const { data, addGroup, updateGroup, deleteGroup, getWorkersByGroup, getOrdersByGroup } = useStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const resetForm = () => {
    setName("")
    setDescription("")
    setEditingId(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (id: string) => {
    const group = data.groups.find(g => g.id === id)
    if (!group) return
    setEditingId(id)
    setName(group.name)
    setDescription(group.description)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }
    if (editingId) {
      updateGroup(editingId, name.trim(), description.trim())
      toast.success("Cuadrilla actualizada")
    } else {
      addGroup(name.trim(), description.trim())
      toast.success("Cuadrilla creada")
    }
    setDialogOpen(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    const workers = getWorkersByGroup(id)
    if (workers.length > 0) {
      toast.error("No puedes eliminar una cuadrilla con mineros asignados")
      return
    }
    deleteGroup(id)
    toast.success("Cuadrilla eliminada")
  }

  return (
    <>
      <PageHeader
        title="Cuadrillas / Equipos"
        description={`${data.groups.length} cuadrillas registradas`}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Cuadrilla
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-card-foreground">
                  {editingId ? "Editar Cuadrilla" : "Nueva Cuadrilla"}
                </DialogTitle>
                <DialogDescription>
                  {editingId ? "Modifica los datos de la cuadrilla" : "Agrega una nueva cuadrilla o equipo de trabajo"}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="group-name">Nombre</Label>
                  <Input
                    id="group-name"
                    placeholder="Ej: Cuadrilla Delta"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="group-desc">Descripcion</Label>
                  <Textarea
                    id="group-desc"
                    placeholder="Ej: Turno dia - Nivel 4800"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {editingId ? "Guardar Cambios" : "Crear Cuadrilla"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        {data.groups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <UsersRound className="h-12 w-12 text-muted-foreground/40" />
              <div className="text-center">
                <p className="font-medium text-card-foreground">No hay cuadrillas</p>
                <p className="text-sm text-muted-foreground">Crea tu primera cuadrilla para empezar</p>
              </div>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Cuadrilla
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.groups.map((group) => {
              const workers = getWorkersByGroup(group.id)
              const orders = getOrdersByGroup(group.id)
              const activeOrders = orders.filter(o => o.status !== "entregado")
              return (
                <Card key={group.id}>
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <UsersRound className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-card-foreground">{group.name}</CardTitle>
                        <CardDescription>{group.description || "Sin descripcion"}</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(group.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(group.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-card-foreground">{workers.length}</p>
                        <p className="text-xs text-muted-foreground">Mineros</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-card-foreground">{orders.length}</p>
                        <p className="text-xs text-muted-foreground">Ordenes</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-card-foreground">{activeOrders.length}</p>
                        <p className="text-xs text-muted-foreground">Activas</p>
                      </div>
                    </div>
                    {workers.length > 0 && (
                      <div className="mt-4 border-t pt-3">
                        <p className="text-xs text-muted-foreground mb-2">Mineros:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {workers.slice(0, 5).map(w => (
                            <span key={w.id} className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                              {w.name}
                            </span>
                          ))}
                          {workers.length > 5 && (
                            <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                              +{workers.length - 5} mas
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
