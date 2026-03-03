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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Shirt } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function PrendasPage() {
  const { data, addGarmentType, updateGarmentType, deleteGarmentType } = useStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")

  const resetForm = () => {
    setName("")
    setPrice("")
    setEditingId(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (id: string) => {
    const gt = data.garmentTypes.find(g => g.id === id)
    if (!gt) return
    setEditingId(id)
    setName(gt.name)
    setPrice(gt.pricePerUnit?.toString() ?? "0")
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }
    const priceNum = parseFloat(price) || 0
    if (editingId) {
      updateGarmentType(editingId, name.trim(), priceNum)
      toast.success("Tipo de prenda actualizado")
    } else {
      addGarmentType(name.trim(), priceNum)
      toast.success("Tipo de prenda creado")
    }
    setDialogOpen(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    // Check if any order item uses this garment type
    const inUse = data.orders.some(o => o.items.some(i => i.garmentTypeId === id))
    if (inUse) {
      toast.error("No puedes eliminar un tipo de prenda que ya tiene ordenes asociadas")
      return
    }
    deleteGarmentType(id)
    toast.success("Tipo de prenda eliminado")
  }

  // Count how many items of each type exist across all orders
  const countByType = (typeId: string) =>
    data.orders.reduce((sum, o) => sum + o.items.filter(i => i.garmentTypeId === typeId).reduce((s, i) => s + i.quantity, 0), 0)

  return (
    <>
      <PageHeader
        title="Tipos de Prenda"
        description={`${data.garmentTypes.length} tipos registrados`}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Tipo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-card-foreground">
                  {editingId ? "Editar Tipo de Prenda" : "Nuevo Tipo de Prenda"}
                </DialogTitle>
                <DialogDescription>
                  {editingId ? "Modifica el nombre del tipo de prenda" : "Agrega un nuevo tipo de prenda al sistema"}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="type-name">Nombre</Label>
                  <Input
                    id="type-name"
                    placeholder="Ej: Casco, Guantes, etc."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="type-price">Precio Unitario (S/)</Label>
                  <Input
                    id="type-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej: 7.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {editingId ? "Guardar Cambios" : "Crear Tipo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        {data.garmentTypes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <Shirt className="h-12 w-12 text-muted-foreground/40" />
              <div className="text-center">
                <p className="font-medium text-card-foreground">No hay tipos de prenda</p>
                <p className="text-sm text-muted-foreground">Crea tu primer tipo para empezar</p>
              </div>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Tipo de Prenda
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Prenda</TableHead>
                    <TableHead>Precio Unit. (S/)</TableHead>
                    <TableHead>Total Registrado</TableHead>
                    <TableHead className="hidden sm:table-cell">Creado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.garmentTypes.map((gt) => (
                    <TableRow key={gt.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Shirt className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-card-foreground">{gt.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-card-foreground font-medium tabular-nums">
                        S/ {gt.pricePerUnit?.toFixed(2) ?? "0.00"}
                      </TableCell>
                      <TableCell className="text-card-foreground">
                        {countByType(gt.id)} unidades
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {format(new Date(gt.createdAt), "dd MMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(gt.id)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(gt.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  )
}
