"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface OrderItemDraft {
  garmentTypeId: string
  quantity: number
  observations: string
}

export default function NuevaOrdenPage() {
  const router = useRouter()
  const { data, addOrder, getWorkersByGroup } = useStore()

  const [groupId, setGroupId] = useState("")
  const [workerId, setWorkerId] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<OrderItemDraft[]>([])

  // Current item being added
  const [currentGarmentType, setCurrentGarmentType] = useState("")
  const [currentQuantity, setCurrentQuantity] = useState("1")
  const [currentObs, setCurrentObs] = useState("")

  const workersInGroup = groupId ? getWorkersByGroup(groupId) : []

  const handleGroupChange = (value: string) => {
    setGroupId(value)
    setWorkerId("")
  }

  const addItem = () => {
    if (!currentGarmentType) {
      toast.error("Selecciona un tipo de prenda")
      return
    }
    const qty = parseInt(currentQuantity)
    if (isNaN(qty) || qty < 1) {
      toast.error("La cantidad debe ser al menos 1")
      return
    }
    setItems(prev => [...prev, {
      garmentTypeId: currentGarmentType,
      quantity: qty,
      observations: currentObs,
    }])
    setCurrentGarmentType("")
    setCurrentQuantity("1")
    setCurrentObs("")
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!groupId) {
      toast.error("Selecciona una cuadrilla")
      return
    }
    if (!workerId) {
      toast.error("Selecciona un minero")
      return
    }
    if (items.length === 0) {
      toast.error("Agrega al menos un item")
      return
    }
    addOrder(workerId, groupId, notes, items)
    toast.success("Orden creada exitosamente")
    router.push("/ordenes")
  }

  return (
    <>
      <PageHeader
        title="Nueva Orden de Lavado"
        description="Registrar una nueva recepcion de prendas"
        actions={
          <Button variant="outline" asChild>
            <Link href="/ordenes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />
      <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Datos del Minero</CardTitle>
              <CardDescription>Selecciona la cuadrilla y el minero</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="group">Cuadrilla</Label>
                <Select value={groupId} onValueChange={handleGroupChange}>
                  <SelectTrigger id="group" className="w-full">
                    <SelectValue placeholder="Seleccionar cuadrilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="worker">Minero</Label>
                <Select value={workerId} onValueChange={setWorkerId} disabled={!groupId}>
                  <SelectTrigger id="worker" className="w-full">
                    <SelectValue placeholder={groupId ? "Seleccionar minero" : "Primero selecciona cuadrilla"} />
                  </SelectTrigger>
                  <SelectContent>
                    {workersInGroup.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name} - {w.dni}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Notas / Observaciones</Label>
                <Textarea
                  id="notes"
                  placeholder="Notas generales de la orden..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Right: Add Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Agregar Prendas</CardTitle>
              <CardDescription>Selecciona el tipo de prenda, cantidad y observaciones</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Tipo de prenda</Label>
                <Select value={currentGarmentType} onValueChange={setCurrentGarmentType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.garmentTypes.map((gt) => (
                      <SelectItem key={gt.id} value={gt.id}>{gt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="qty">Cantidad</Label>
                  <Input
                    id="qty"
                    type="number"
                    min="1"
                    value={currentQuantity}
                    onChange={(e) => setCurrentQuantity(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="obs">Observacion</Label>
                  <Input
                    id="obs"
                    placeholder="Ej: manchas"
                    value={currentObs}
                    onChange={(e) => setCurrentObs(e.target.value)}
                  />
                </div>
              </div>
              <Button variant="outline" onClick={addItem} className="self-start">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Prenda
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Items List */}
        {items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">
                Prendas en la Orden ({items.reduce((s, i) => s + i.quantity, 0)} prendas)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prenda</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Observacion</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => {
                    const gt = data.garmentTypes.find(g => g.id === item.garmentTypeId)
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-card-foreground">{gt?.name ?? "-"}</TableCell>
                        <TableCell className="text-card-foreground">{item.quantity}</TableCell>
                        <TableCell className="text-muted-foreground">{item.observations || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <Button onClick={handleSubmit} size="lg" disabled={items.length === 0 || !workerId}>
            <Save className="mr-2 h-4 w-4" />
            Registrar Orden
          </Button>
        </div>
      </main>
    </>
  )
}
