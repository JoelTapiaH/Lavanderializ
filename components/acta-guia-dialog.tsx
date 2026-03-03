"use client"

import { useState, useEffect } from "react"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { GarmentType, Acta, Guia, ValorizacionItem } from "@/lib/types"

interface ActaGuiaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "acta" | "guia"
  valorizacionId: string
  editId: string | null
  garmentTypes: GarmentType[]
  existingEntries: (Acta | Guia)[]
}

interface FormItem {
  garmentTypeId: string
  quantity: string
}

export function ActaGuiaDialog({
  open,
  onOpenChange,
  type,
  valorizacionId,
  editId,
  garmentTypes,
  existingEntries,
}: ActaGuiaDialogProps) {
  const { addActa, updateActa, addGuia, updateGuia } = useStore()
  const [number, setNumber] = useState("")
  const [date, setDate] = useState("")
  const [items, setItems] = useState<FormItem[]>([
    { garmentTypeId: "", quantity: "" },
  ])

  const editing = editId
    ? existingEntries.find((e) => e.id === editId)
    : null
  const label = type === "acta" ? "Acta" : "Guia"

  useEffect(() => {
    if (open) {
      if (editing) {
        setNumber((editing as Acta | Guia).number || "")
        setDate(editing.date)
        setItems(
          editing.items.map((i) => ({
            garmentTypeId: i.garmentTypeId,
            quantity: i.quantity.toString(),
          }))
        )
      } else {
        setNumber("")
        setDate("")
        setItems([{ garmentTypeId: "", quantity: "" }])
      }
    }
  }, [open, editing])

  function addItemRow() {
    setItems([...items, { garmentTypeId: "", quantity: "" }])
  }

  function removeItemRow(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof FormItem, value: string) {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function handleSubmit() {
    if (!date) {
      toast.error("Ingresa la fecha")
      return
    }

    const validItems: ValorizacionItem[] = items
      .filter((item) => item.garmentTypeId && Number(item.quantity) > 0)
      .map((item) => ({
        garmentTypeId: item.garmentTypeId,
        quantity: Number(item.quantity),
      }))

    if (validItems.length === 0) {
      toast.error("Agrega al menos un item con cantidad")
      return
    }

    if (editing) {
      if (type === "acta") {
        updateActa(valorizacionId, editing.id, number.trim(), date, validItems)
      } else {
        updateGuia(valorizacionId, editing.id, number.trim(), date, validItems)
      }
      toast.success(`${label} actualizada`)
    } else {
      if (type === "acta") {
        addActa(valorizacionId, number.trim(), date, validItems)
      } else {
        addGuia(valorizacionId, number.trim(), date, validItems)
      }
      toast.success(`${label} registrada`)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Editar ${label}` : `Nueva ${label}`}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="entry-date">Fecha</Label>
              <Input
                id="entry-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="entry-number">
                {"N. de "}{label}
              </Label>
              <Input
                id="entry-number"
                placeholder="Ej: 2349"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Prendas</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItemRow}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Agregar Prenda
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2"
                >
                  <Select
                    value={item.garmentTypeId}
                    onValueChange={(v) =>
                      updateItem(index, "garmentTypeId", v)
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Tipo de prenda" />
                    </SelectTrigger>
                    <SelectContent>
                      {garmentTypes.map((gt) => (
                        <SelectItem key={gt.id} value={gt.id}>
                          {gt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Cantidad"
                    className="w-24"
                    min="0"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", e.target.value)
                    }
                  />
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeItemRow(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Eliminar fila</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editing ? "Guardar" : `Registrar ${label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
