"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface ItemFormState {
  code: string
  name: string
  unit: string
  quantity: string
  minStock: string
  cost: string
  notes: string
}

const emptyItemForm: ItemFormState = {
  code: "",
  name: "",
  unit: "und",
  quantity: "0",
  minStock: "0",
  cost: "0",
  notes: "",
}

interface MovementFormState {
  type: "entrada" | "salida"
  quantity: string
  notes: string
}

export default function InventarioPage() {
  const { data, addInventoryItem, updateInventoryItem, deleteInventoryItem, addInventoryMovement } = useStore()

  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm)

  const [movementDialogOpen, setMovementDialogOpen] = useState(false)
  const [movementItemId, setMovementItemId] = useState<string | null>(null)
  const [movementForm, setMovementForm] = useState<MovementFormState>({ type: "entrada", quantity: "", notes: "" })

  const [historyItemId, setHistoryItemId] = useState<string | null>(null)

  // item that matches the typed code (for duplicate detection)
  const duplicateItem = !editItemId && itemForm.code.trim()
    ? data.inventoryItems.find((i) => i.code === itemForm.code.trim().toUpperCase())
    : null

  function openAddItem() {
    setEditItemId(null)
    setItemForm(emptyItemForm)
    setItemDialogOpen(true)
  }

  function openEditItem(id: string) {
    const item = data.inventoryItems.find((i) => i.id === id)
    if (!item) return
    setEditItemId(id)
    setItemForm({
      code: item.code,
      name: item.name,
      unit: item.unit,
      quantity: String(item.quantity),
      minStock: String(item.minStock),
      cost: String(item.cost),
      notes: item.notes,
    })
    setItemDialogOpen(true)
  }

  async function handleSaveItem() {
    if (!itemForm.code.trim()) { toast.error("El código es requerido"); return }
    if (!itemForm.name.trim()) { toast.error("El nombre es requerido"); return }
    if (!editItemId && duplicateItem) { toast.error(`El código ${duplicateItem.code} ya existe`); return }
    if (editItemId) {
      await updateInventoryItem(
        editItemId,
        itemForm.code.trim().toUpperCase(),
        itemForm.name.trim(),
        itemForm.unit.trim(),
        Number(itemForm.minStock) || 0,
        Number(itemForm.cost) || 0,
        itemForm.notes.trim(),
      )
      toast.success("Item actualizado")
    } else {
      await addInventoryItem(
        itemForm.code.trim().toUpperCase(),
        itemForm.name.trim(),
        itemForm.unit.trim(),
        Number(itemForm.quantity) || 0,
        Number(itemForm.minStock) || 0,
        Number(itemForm.cost) || 0,
        itemForm.notes.trim(),
      )
      toast.success("Item agregado")
    }
    setItemDialogOpen(false)
  }

  async function handleDeleteItem(id: string) {
    await deleteInventoryItem(id)
    if (historyItemId === id) setHistoryItemId(null)
    toast.success("Item eliminado")
  }

  function openMovement(itemId: string, type: "entrada" | "salida") {
    setMovementItemId(itemId)
    setMovementForm({ type, quantity: "", notes: "" })
    setMovementDialogOpen(true)
  }

  async function handleSaveMovement() {
    if (!movementItemId) return
    const qty = Number(movementForm.quantity)
    if (!qty || qty <= 0) { toast.error("La cantidad debe ser mayor a 0"); return }
    const item = data.inventoryItems.find((i) => i.id === movementItemId)
    if (movementForm.type === "salida" && item && qty > item.quantity) {
      toast.error("Stock insuficiente"); return
    }
    await addInventoryMovement(movementItemId, movementForm.type, qty, movementForm.notes.trim())
    toast.success(movementForm.type === "entrada" ? "Entrada registrada" : "Salida registrada")
    setMovementDialogOpen(false)
  }

  const historyItem = historyItemId ? data.inventoryItems.find((i) => i.id === historyItemId) : null
  const historyMovements = historyItemId
    ? data.inventoryMovements.filter((m) => m.itemId === historyItemId)
    : []

  const lowStockItems = data.inventoryItems.filter((i) => i.quantity < i.minStock)

  return (
    <>
      <PageHeader
        title="Control de Inventario"
        description="Gestiona el stock de insumos y materiales."
        actions={
          <Button onClick={openAddItem}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Item
          </Button>
        }
      />
      <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">

        {/* Low stock alert */}
        {lowStockItems.length > 0 && (
          <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                    {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} bajo el stock mínimo
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {lowStockItems.map((i) => (
                      <span
                        key={i.id}
                        className="inline-flex items-center gap-1.5 rounded-md bg-yellow-100 dark:bg-yellow-900/40 px-2 py-1 text-xs text-yellow-900 dark:text-yellow-200"
                      >
                        <span className="font-mono font-bold">{i.code}</span>
                        <span>{i.name}</span>
                        <span className="text-yellow-600">—</span>
                        <span className="font-semibold text-red-600">{i.quantity} {i.unit}</span>
                        <span className="text-yellow-600">/ mín {i.minStock} {i.unit}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Items table */}
          <div className="flex-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Items de Inventario</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Mínimo</TableHead>
                        <TableHead className="text-right">Costo U.</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.inventoryItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                            No hay items registrados.
                          </TableCell>
                        </TableRow>
                      )}
                      {data.inventoryItems.map((item) => {
                        const isLow = item.quantity < item.minStock
                        return (
                          <TableRow
                            key={item.id}
                            className={`cursor-pointer ${historyItemId === item.id ? "bg-muted/50" : ""}`}
                            onClick={() => setHistoryItemId(historyItemId === item.id ? null : item.id)}
                          >
                            <TableCell>
                              <span className="font-mono text-xs font-bold bg-muted px-1.5 py-0.5 rounded">
                                {item.code}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.name}
                              {item.notes && (
                                <p className="text-xs text-muted-foreground truncate max-w-[180px]">{item.notes}</p>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={isLow ? "text-red-600 font-bold" : ""}>
                                {item.quantity.toLocaleString()} {item.unit}
                              </span>
                              {isLow && (
                                <AlertTriangle className="inline ml-1 h-3.5 w-3.5 text-red-500" />
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {item.minStock} {item.unit}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              S/ {item.cost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              S/ {(item.quantity * item.cost).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon" variant="ghost"
                                  className="h-7 w-7 text-green-600 hover:text-green-700"
                                  title="Entrada"
                                  onClick={() => openMovement(item.id, "entrada")}
                                >
                                  <ArrowUpCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon" variant="ghost"
                                  className="h-7 w-7 text-orange-600 hover:text-orange-700"
                                  title="Salida"
                                  onClick={() => openMovement(item.id, "salida")}
                                >
                                  <ArrowDownCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon" variant="ghost" className="h-7 w-7"
                                  onClick={() => openEditItem(item.id)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon" variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Movement history panel */}
          {historyItem && (
            <div className="w-full lg:w-80 shrink-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Historial —{" "}
                    <span className="font-mono text-sm bg-muted px-1 rounded">{historyItem.code}</span>{" "}
                    {historyItem.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    {historyMovements.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">Sin movimientos.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Cant.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {historyMovements.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(m.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                                {m.notes && <p className="text-xs truncate max-w-[100px]">{m.notes}</p>}
                              </TableCell>
                              <TableCell>
                                <Badge className={m.type === "entrada"
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : "bg-orange-100 text-orange-800 hover:bg-orange-100"
                                }>
                                  {m.type === "entrada" ? "Entrada" : "Salida"}
                                </Badge>
                              </TableCell>
                              <TableCell className={`text-right font-medium text-sm ${m.type === "entrada" ? "text-green-700" : "text-orange-700"}`}>
                                {m.type === "entrada" ? "+" : "-"}{m.quantity.toLocaleString()} {historyItem.unit}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Item dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItemId ? "Editar Item" : "Nuevo Item"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label>Código</Label>
                <Input
                  className={`font-mono uppercase ${duplicateItem ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  placeholder="BLS-G"
                  value={itemForm.code}
                  onChange={(e) => setItemForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="col-span-2 grid gap-1.5">
                <Label>Nombre</Label>
                <Input
                  placeholder="Ej: Bolsas grandes"
                  value={itemForm.name}
                  onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>
            {duplicateItem && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p className="font-medium mb-1">
                  El código <span className="font-mono">{duplicateItem.code}</span> ya existe — <span className="font-semibold">{duplicateItem.name}</span>
                </p>
                <p className="text-xs text-red-500 mb-2">
                  Stock actual: {duplicateItem.quantity} {duplicateItem.unit}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                  onClick={() => {
                    setItemDialogOpen(false)
                    openMovement(duplicateItem.id, "entrada")
                  }}
                >
                  <ArrowUpCircle className="mr-1.5 h-3.5 w-3.5" />
                  Registrar entrada para este item
                </Button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label>Unidad</Label>
                <Input
                  placeholder="und, kg, lt…"
                  value={itemForm.unit}
                  onChange={(e) => setItemForm((f) => ({ ...f, unit: e.target.value }))}
                />
              </div>
              {!editItemId && (
                <div className="grid gap-1.5">
                  <Label>Stock inicial</Label>
                  <Input
                    type="number" min="0"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
              )}
              <div className="grid gap-1.5">
                <Label>Stock mínimo</Label>
                <Input
                  type="number" min="0"
                  value={itemForm.minStock}
                  onChange={(e) => setItemForm((f) => ({ ...f, minStock: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Costo (S/)</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={itemForm.cost}
                  onChange={(e) => setItemForm((f) => ({ ...f, cost: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Notas</Label>
              <Textarea rows={2} value={itemForm.notes} onChange={(e) => setItemForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem} disabled={!!duplicateItem}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement dialog */}
      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {movementForm.type === "entrada" ? "Registrar Entrada" : "Registrar Salida"}
              {movementItemId && (() => {
                const item = data.inventoryItems.find((i) => i.id === movementItemId)
                return item ? (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    — <span className="font-mono">{item.code}</span> {item.name}
                  </span>
                ) : null
              })()}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select value={movementForm.type} onValueChange={(v) => setMovementForm((f) => ({ ...f, type: v as "entrada" | "salida" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="salida">Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Cantidad</Label>
              <Input
                type="number" min="1"
                value={movementForm.quantity}
                onChange={(e) => setMovementForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Notas</Label>
              <Textarea rows={2} value={movementForm.notes} onChange={(e) => setMovementForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveMovement}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
