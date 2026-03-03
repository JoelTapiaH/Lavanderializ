"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react"
import { toast } from "sonner"

export default function MinerosPage() {
  const { data, addWorker, updateWorker, deleteWorker, getGroup, getOrdersByWorker } = useStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [dni, setDni] = useState("")
  const [groupId, setGroupId] = useState("")
  const [search, setSearch] = useState("")
  const [filterGroup, setFilterGroup] = useState<string>("todos")

  const resetForm = () => {
    setName("")
    setDni("")
    setGroupId("")
    setEditingId(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (id: string) => {
    const w = data.workers.find(w => w.id === id)
    if (!w) return
    setEditingId(id)
    setName(w.name)
    setDni(w.dni)
    setGroupId(w.groupId)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!name.trim()) { toast.error("El nombre es obligatorio"); return }
    if (!dni.trim()) { toast.error("El DNI es obligatorio"); return }
    if (!groupId) { toast.error("Selecciona una cuadrilla"); return }
    if (editingId) {
      updateWorker(editingId, name.trim(), dni.trim(), groupId)
      toast.success("Minero actualizado")
    } else {
      addWorker(name.trim(), dni.trim(), groupId)
      toast.success("Minero registrado")
    }
    setDialogOpen(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    const orders = getOrdersByWorker(id)
    if (orders.length > 0) {
      toast.error("No puedes eliminar un minero con ordenes registradas")
      return
    }
    deleteWorker(id)
    toast.success("Minero eliminado")
  }

  const filtered = data.workers.filter(w => {
    const matchSearch = search === "" ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.dni.includes(search)
    const matchGroup = filterGroup === "todos" || w.groupId === filterGroup
    return matchSearch && matchGroup
  })

  return (
    <>
      <PageHeader
        title="Mineros / Trabajadores"
        description={`${data.workers.length} mineros registrados`}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Minero
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-card-foreground">
                  {editingId ? "Editar Minero" : "Nuevo Minero"}
                </DialogTitle>
                <DialogDescription>
                  {editingId ? "Modifica los datos del minero" : "Registra un nuevo minero en el sistema"}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="worker-name">Nombre Completo</Label>
                  <Input
                    id="worker-name"
                    placeholder="Ej: Juan Perez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="worker-dni">DNI</Label>
                  <Input
                    id="worker-dni"
                    placeholder="Ej: 12345678"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Cuadrilla</Label>
                  <Select value={groupId} onValueChange={setGroupId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar cuadrilla" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {editingId ? "Guardar Cambios" : "Registrar Minero"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o DNI..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Cuadrilla" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las cuadrillas</SelectItem>
              {data.groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <Users className="h-12 w-12 text-muted-foreground/40" />
              <div className="text-center">
                <p className="font-medium text-card-foreground">No se encontraron mineros</p>
                <p className="text-sm text-muted-foreground">
                  {search || filterGroup !== "todos" ? "Intenta con otros filtros" : "Registra tu primer minero"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Cuadrilla</TableHead>
                    <TableHead className="hidden sm:table-cell">Ordenes</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((worker) => {
                    const group = getGroup(worker.groupId)
                    const orders = getOrdersByWorker(worker.id)
                    return (
                      <TableRow key={worker.id}>
                        <TableCell className="font-medium text-card-foreground">{worker.name}</TableCell>
                        <TableCell className="text-muted-foreground">{worker.dni}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                            {group?.name ?? "-"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">{orders.length}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(worker.id)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(worker.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  )
}
