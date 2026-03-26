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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Building2, Settings2 } from "lucide-react"
import { toast } from "sonner"

export default function ProyectosPage() {
  const { data, addProject, updateProject, deleteProject, upsertProjectGarmentPrice } = useStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const [pricesProjectId, setPricesProjectId] = useState<string | null>(null)
  // local price drafts: garmentTypeId -> string value
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({})

  function openCreate() {
    setEditingId(null)
    setName("")
    setDescription("")
    setDialogOpen(true)
  }

  function openEdit(id: string) {
    const p = data.projects.find((p) => p.id === id)
    if (!p) return
    setEditingId(id)
    setName(p.name)
    setDescription(p.description)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("El nombre es obligatorio"); return }
    if (editingId) {
      await updateProject(editingId, name.trim(), description.trim())
      toast.success("Proyecto actualizado")
    } else {
      await addProject(name.trim(), description.trim())
      toast.success("Proyecto creado")
    }
    setDialogOpen(false)
  }

  async function handleDelete(id: string) {
    const linked = data.valorizaciones.filter((v) => v.projectId === id).length
    if (linked > 0) {
      toast.error(`No puedes eliminar un proyecto con ${linked} periodo(s) de valorización`)
      return
    }
    await deleteProject(id)
    toast.success("Proyecto eliminado")
  }

  function openPrices(id: string) {
    // Build initial drafts from existing overrides
    const drafts: Record<string, string> = {}
    for (const gt of data.garmentTypes) {
      const override = data.projectGarmentPrices.find(
        (p) => p.projectId === id && p.garmentTypeId === gt.id
      )
      drafts[gt.id] = String(override?.pricePerUnit ?? gt.pricePerUnit)
    }
    setPriceDrafts(drafts)
    setPricesProjectId(id)
  }

  async function handlePriceBlur(garmentTypeId: string) {
    if (!pricesProjectId) return
    const val = parseFloat(priceDrafts[garmentTypeId])
    if (isNaN(val) || val < 0) return
    await upsertProjectGarmentPrice(pricesProjectId, garmentTypeId, val)
  }

  const pricesProject = pricesProjectId ? data.projects.find((p) => p.id === pricesProjectId) : null

  return (
    <>
      <PageHeader
        title="Proyectos"
        description="Gestiona los proyectos (clientes mineros) y sus precios unitarios por prenda."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Proyecto
          </Button>
        }
      />
      <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        {data.projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <Building2 className="h-12 w-12 text-muted-foreground/40" />
              <div className="text-center">
                <p className="font-medium">No hay proyectos</p>
                <p className="text-sm text-muted-foreground">Crea tu primer proyecto para comenzar</p>
              </div>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Proyecto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.projects.map((project) => {
              const linkedPeriods = data.valorizaciones.filter((v) => v.projectId === project.id).length
              const customPrices = data.projectGarmentPrices.filter((p) => p.projectId === project.id).length
              return (
                <Card key={project.id}>
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{project.name}</CardTitle>
                        <CardDescription>{project.description || "Sin descripción"}</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(project.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(project.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{linkedPeriods}</p>
                        <p className="text-xs text-muted-foreground">Valorizaciones</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{customPrices}</p>
                        <p className="text-xs text-muted-foreground">Precios config.</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => openPrices(project.id)}>
                      <Settings2 className="mr-2 h-3.5 w-3.5" />
                      Configurar Precios
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Proyecto" : "Nuevo Proyecto"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Nombre</Label>
              <Input
                placeholder="Ej: Minera Lincuna"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Ej: Contrato N° 123 - Unidad Minera Lincuna"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prices dialog */}
      <Dialog open={!!pricesProjectId} onOpenChange={(open) => { if (!open) setPricesProjectId(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Precios — {pricesProject?.name}
            </DialogTitle>
          </DialogHeader>
          {data.garmentTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No hay tipos de prenda configurados.</p>
          ) : (
            <div className="overflow-y-auto max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prenda</TableHead>
                    <TableHead className="text-right">Precio Global</TableHead>
                    <TableHead className="text-right w-36">Precio Proyecto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.garmentTypes.map((gt) => (
                    <TableRow key={gt.id}>
                      <TableCell className="font-medium">{gt.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        S/ {gt.pricePerUnit.toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 6 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          step="0.0001"
                          className="w-32 text-right ml-auto"
                          value={priceDrafts[gt.id] ?? ""}
                          onChange={(e) =>
                            setPriceDrafts((d) => ({ ...d, [gt.id]: e.target.value }))
                          }
                          onBlur={() => handlePriceBlur(gt.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setPricesProjectId(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
