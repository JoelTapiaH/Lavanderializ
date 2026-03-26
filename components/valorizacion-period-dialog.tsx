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
import { toast } from "sonner"

interface ValorizacionPeriodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editId: string | null
}

export function ValorizacionPeriodDialog({
  open,
  onOpenChange,
  editId,
}: ValorizacionPeriodDialogProps) {
  const { data, addValorizacion, updateValorizacion } = useStore()
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [projectId, setProjectId] = useState("")

  const editing = editId ? data.valorizaciones.find((v) => v.id === editId) : null

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name)
        setStartDate(editing.startDate)
        setEndDate(editing.endDate)
        setProjectId(editing.projectId ?? "")
      } else {
        setName("")
        setStartDate("")
        setEndDate("")
        setProjectId("")
      }
    }
  }, [open, editing])

  function handleSubmit() {
    if (!name.trim() || !startDate || !endDate) {
      toast.error("Completa todos los campos")
      return
    }
    if (!projectId) {
      toast.error("Selecciona un proyecto")
      return
    }
    if (editing) {
      updateValorizacion(editing.id, name.trim(), startDate, endDate, projectId)
      toast.success("Periodo actualizado")
    } else {
      addValorizacion(name.trim(), startDate, endDate, projectId)
      toast.success("Periodo creado")
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar Periodo" : "Nuevo Periodo de Valorizacion"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="period-name">Nombre del periodo</Label>
            <Input
              id="period-name"
              placeholder="Ej: Enero 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="period-project">Proyecto <span className="text-destructive">*</span></Label>
            {data.projects.length === 0 ? (
              <p className="text-sm text-destructive">
                No hay proyectos. Crea uno primero en la sección <strong>Proyectos</strong>.
              </p>
            ) : (
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="period-project">
                  <SelectValue placeholder="Selecciona un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {data.projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="period-start">Fecha inicio</Label>
              <Input
                id="period-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="period-end">Fecha fin</Label>
              <Input
                id="period-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={data.projects.length === 0}>
            {editing ? "Guardar" : "Crear Periodo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
