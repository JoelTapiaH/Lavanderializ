"use client"

import { useState, useMemo } from "react"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, Pencil, Trash2, ChevronLeft, AlertCircle,
  Truck, Car, WashingMachine, FileText, Wrench, AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import type { Equipment, EquipmentDocument, MaintenanceRecord } from "@/lib/types"

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
  return diff
}

function tipoLabel(tipo: Equipment["tipo"]) {
  return tipo === "lavadora" ? "Lavadora" : tipo === "carro" ? "Carro" : "Camión"
}

function tipoIcon(tipo: Equipment["tipo"]) {
  if (tipo === "lavadora") return <WashingMachine className="h-4 w-4" />
  if (tipo === "carro") return <Car className="h-4 w-4" />
  return <Truck className="h-4 w-4" />
}

function estadoBadge(estado: Equipment["estado"]) {
  if (estado === "activo") return <Badge className="bg-green-600 text-white">Activo</Badge>
  if (estado === "en_mantenimiento") return <Badge className="bg-orange-500 text-white">En Mantenimiento</Badge>
  return <Badge variant="secondary">Inactivo</Badge>
}

function docVencimientoColor(days: number | null): string {
  if (days === null) return ""
  if (days < 0) return "text-red-600 font-semibold"
  if (days <= 30) return "text-orange-500 font-semibold"
  return "text-green-700"
}

// ── Empty forms ────────────────────────────────────────────────────────────────

const emptyEqForm = {
  nombre: "", tipo: "carro" as Equipment["tipo"], marca: "", modelo: "",
  placa: "", anio: "", fechaAdquisicion: "", estado: "activo" as Equipment["estado"], notas: "",
}

const emptyDocForm = {
  nombre: "", numero: "", fechaEmision: "", fechaVencimiento: "", notas: "",
}

const emptyMaintForm = {
  fecha: "", tipo: "preventivo" as MaintenanceRecord["tipo"],
  descripcion: "", piezasReemplazadas: "", proveedor: "",
  costo: "0", proximoMantenimiento: "", notas: "",
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function EquiposPage() {
  const {
    data,
    addEquipment, updateEquipment, deleteEquipment,
    addEquipmentDocument, updateEquipmentDocument, deleteEquipmentDocument,
    addMaintenanceRecord, updateMaintenanceRecord, deleteMaintenanceRecord,
  } = useStore()

  const today = new Date().toISOString().split("T")[0]

  // ── Navigation ─────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedEquipment = data.equipment.find((e) => e.id === selectedId) ?? null

  // ── Equipment CRUD ─────────────────────────────────────────────────────────
  const [eqOpen, setEqOpen] = useState(false)
  const [editEqId, setEditEqId] = useState<string | null>(null)
  const [eqForm, setEqForm] = useState({ ...emptyEqForm })
  const [deleteEqId, setDeleteEqId] = useState<string | null>(null)

  function openNewEq() {
    setEditEqId(null)
    setEqForm({ ...emptyEqForm })
    setEqOpen(true)
  }
  function openEditEq(eq: Equipment) {
    setEditEqId(eq.id)
    setEqForm({
      nombre: eq.nombre, tipo: eq.tipo, marca: eq.marca, modelo: eq.modelo,
      placa: eq.placa, anio: eq.anio?.toString() ?? "", fechaAdquisicion: eq.fechaAdquisicion,
      estado: eq.estado, notas: eq.notas,
    })
    setEqOpen(true)
  }
  async function saveEq() {
    if (!eqForm.nombre.trim()) { toast.error("Nombre requerido"); return }
    const anio = eqForm.anio ? parseInt(eqForm.anio) : null
    if (editEqId) {
      await updateEquipment(editEqId, eqForm.nombre.trim(), eqForm.tipo, eqForm.marca, eqForm.modelo, eqForm.placa, anio, eqForm.fechaAdquisicion, eqForm.estado, eqForm.notas)
      toast.success("Equipo actualizado")
    } else {
      await addEquipment(eqForm.nombre.trim(), eqForm.tipo, eqForm.marca, eqForm.modelo, eqForm.placa, anio, eqForm.fechaAdquisicion, eqForm.estado, eqForm.notas)
      toast.success("Equipo registrado")
    }
    setEqOpen(false)
  }

  // ── Document CRUD ──────────────────────────────────────────────────────────
  const [docOpen, setDocOpen] = useState(false)
  const [editDocId, setEditDocId] = useState<string | null>(null)
  const [docForm, setDocForm] = useState({ ...emptyDocForm })
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null)

  function openNewDoc() {
    setEditDocId(null)
    setDocForm({ ...emptyDocForm })
    setDocOpen(true)
  }
  function openEditDoc(doc: EquipmentDocument) {
    setEditDocId(doc.id)
    setDocForm({ nombre: doc.nombre, numero: doc.numero, fechaEmision: doc.fechaEmision, fechaVencimiento: doc.fechaVencimiento, notas: doc.notas })
    setDocOpen(true)
  }
  async function saveDoc() {
    if (!selectedEquipment || !docForm.nombre.trim()) { toast.error("Nombre requerido"); return }
    if (editDocId) {
      await updateEquipmentDocument(editDocId, docForm.nombre.trim(), docForm.numero, docForm.fechaEmision, docForm.fechaVencimiento, docForm.notas)
      toast.success("Documento actualizado")
    } else {
      await addEquipmentDocument(selectedEquipment.id, docForm.nombre.trim(), docForm.numero, docForm.fechaEmision, docForm.fechaVencimiento, docForm.notas)
      toast.success("Documento agregado")
    }
    setDocOpen(false)
  }

  // ── Maintenance CRUD ───────────────────────────────────────────────────────
  const [maintOpen, setMaintOpen] = useState(false)
  const [editMaintId, setEditMaintId] = useState<string | null>(null)
  const [maintForm, setMaintForm] = useState({ ...emptyMaintForm })
  const [deleteMaintId, setDeleteMaintId] = useState<string | null>(null)

  function openNewMaint() {
    setEditMaintId(null)
    setMaintForm({ ...emptyMaintForm, fecha: today })
    setMaintOpen(true)
  }
  function openEditMaint(m: MaintenanceRecord) {
    setEditMaintId(m.id)
    setMaintForm({
      fecha: m.fecha, tipo: m.tipo, descripcion: m.descripcion,
      piezasReemplazadas: m.piezasReemplazadas, proveedor: m.proveedor,
      costo: m.costo.toString(), proximoMantenimiento: m.proximoMantenimiento, notas: m.notas,
    })
    setMaintOpen(true)
  }
  async function saveMaint() {
    if (!selectedEquipment || !maintForm.fecha) { toast.error("Fecha requerida"); return }
    const costo = parseFloat(maintForm.costo) || 0
    if (editMaintId) {
      await updateMaintenanceRecord(editMaintId, maintForm.fecha, maintForm.tipo, maintForm.descripcion, maintForm.piezasReemplazadas, maintForm.proveedor, costo, maintForm.proximoMantenimiento, maintForm.notas)
      toast.success("Mantenimiento actualizado")
    } else {
      await addMaintenanceRecord(selectedEquipment.id, maintForm.fecha, maintForm.tipo, maintForm.descripcion, maintForm.piezasReemplazadas, maintForm.proveedor, costo, maintForm.proximoMantenimiento, maintForm.notas)
      toast.success("Mantenimiento registrado")
    }
    setMaintOpen(false)
  }

  // ── Alerts ─────────────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const expired: string[] = []
    const soon: string[] = []
    for (const doc of data.equipmentDocuments) {
      if (!doc.fechaVencimiento) continue
      const days = daysUntil(doc.fechaVencimiento)
      if (days === null) continue
      const eq = data.equipment.find((e) => e.id === doc.equipmentId)
      const label = `${eq?.nombre ?? "Equipo"} — ${doc.nombre}`
      if (days < 0) expired.push(label)
      else if (days <= 30) soon.push(`${label} (${days}d)`)
    }
    for (const m of data.maintenanceRecords) {
      if (!m.proximoMantenimiento) continue
      const days = daysUntil(m.proximoMantenimiento)
      if (days === null) continue
      const eq = data.equipment.find((e) => e.id === m.equipmentId)
      const label = `Próx. mantenimiento — ${eq?.nombre ?? "Equipo"}`
      if (days < 0) expired.push(label)
      else if (days <= 30) soon.push(`${label} (${days}d)`)
    }
    return { expired, soon }
  }, [data.equipmentDocuments, data.maintenanceRecords, data.equipment])

  // ── DETAIL VIEW ────────────────────────────────────────────────────────────
  if (selectedEquipment) {
    const docs = data.equipmentDocuments.filter((d) => d.equipmentId === selectedEquipment.id)
    const maints = data.maintenanceRecords.filter((m) => m.equipmentId === selectedEquipment.id)
    const totalCosto = maints.reduce((s, m) => s + m.costo, 0)
    const ultimoMaint = maints[0] ?? null
    const proximoMaint = maints.find((m) => m.proximoMantenimiento) ?? null

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted">
                {tipoIcon(selectedEquipment.tipo)}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{selectedEquipment.nombre}</h1>
                <p className="text-sm text-muted-foreground">
                  {tipoLabel(selectedEquipment.tipo)}
                  {selectedEquipment.marca && ` · ${selectedEquipment.marca}`}
                  {selectedEquipment.modelo && ` ${selectedEquipment.modelo}`}
                  {selectedEquipment.placa && ` · Placa: ${selectedEquipment.placa}`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {estadoBadge(selectedEquipment.estado)}
            <Button variant="outline" size="sm" onClick={() => openEditEq(selectedEquipment)}>
              <Pencil className="h-4 w-4 mr-1" />Editar
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { label: "Costo Total Mant.", value: fmt(totalCosto), color: "text-blue-600" },
            { label: "N° Mantenimientos", value: maints.length.toString(), color: "" },
            { label: "Último Mant.", value: ultimoMaint?.fecha ?? "—", color: "" },
            { label: "Próximo Mant.", value: proximoMaint?.proximoMantenimiento ?? "—", color: proximoMaint && daysUntil(proximoMaint.proximoMantenimiento) !== null && (daysUntil(proximoMaint.proximoMantenimiento) ?? 99) <= 30 ? "text-orange-500" : "" },
          ].map((k) => (
            <div key={k.label} className="rounded-lg border bg-card px-3 py-2">
              <p className="text-[11px] text-muted-foreground leading-tight">{k.label}</p>
              <p className={`text-sm font-bold mt-0.5 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="documentos">
          <TabsList>
            <TabsTrigger value="documentos">
              <FileText className="h-3.5 w-3.5 mr-1.5" />Documentos ({docs.length})
            </TabsTrigger>
            <TabsTrigger value="mantenimientos">
              <Wrench className="h-3.5 w-3.5 mr-1.5" />Mantenimientos ({maints.length})
            </TabsTrigger>
          </TabsList>

          {/* Documentos */}
          <TabsContent value="documentos" className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={openNewDoc}><Plus className="h-4 w-4 mr-1" />Agregar Documento</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>N° / Código</TableHead>
                      <TableHead>Emisión</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map((doc) => {
                      const days = daysUntil(doc.fechaVencimiento)
                      return (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.nombre}</TableCell>
                          <TableCell className="text-muted-foreground">{doc.numero || "—"}</TableCell>
                          <TableCell>{doc.fechaEmision || "—"}</TableCell>
                          <TableCell>
                            {doc.fechaVencimiento ? (
                              <span className={docVencimientoColor(days)}>
                                {doc.fechaVencimiento}
                                {days !== null && (
                                  <span className="ml-1 text-xs">
                                    {days < 0 ? `(vencido hace ${Math.abs(days)}d)` : days === 0 ? "(vence hoy)" : `(${days}d)`}
                                  </span>
                                )}
                              </span>
                            ) : <span className="text-muted-foreground text-sm">Sin vencimiento</span>}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{doc.notas || "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEditDoc(doc)}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="text-red-500" onClick={() => setDeleteDocId(doc.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {docs.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay documentos registrados</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mantenimientos */}
          <TabsContent value="mantenimientos" className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={openNewMaint}><Plus className="h-4 w-4 mr-1" />Registrar Mantenimiento</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Piezas</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead>Próx. Mant.</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maints.map((m) => {
                      const daysProx = daysUntil(m.proximoMantenimiento)
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium whitespace-nowrap">{m.fecha}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              m.tipo === "correctivo" ? "border-red-300 text-red-700" :
                              m.tipo === "preventivo" ? "border-blue-300 text-blue-700" :
                              "border-gray-300 text-gray-700"
                            }>
                              {m.tipo === "preventivo" ? "Preventivo" : m.tipo === "correctivo" ? "Correctivo" : "Revisión"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate">{m.descripcion || "—"}</TableCell>
                          <TableCell className="max-w-[120px] truncate text-muted-foreground text-sm">{m.piezasReemplazadas || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{m.proveedor || "—"}</TableCell>
                          <TableCell className="text-right font-medium">{m.costo > 0 ? fmt(m.costo) : "—"}</TableCell>
                          <TableCell>
                            {m.proximoMantenimiento ? (
                              <span className={docVencimientoColor(daysProx)}>
                                {m.proximoMantenimiento}
                                {daysProx !== null && daysProx <= 30 && (
                                  <span className="ml-1 text-xs">({daysProx < 0 ? "vencido" : `${daysProx}d`})</span>
                                )}
                              </span>
                            ) : <span className="text-muted-foreground text-sm">—</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEditMaint(m)}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="text-red-500" onClick={() => setDeleteMaintId(m.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {maints.length > 0 && (
                      <TableRow className="border-t-2 font-bold bg-muted/40">
                        <TableCell colSpan={5}>TOTAL</TableCell>
                        <TableCell className="text-right text-blue-600">{fmt(totalCosto)}</TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    )}
                    {maints.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No hay mantenimientos registrados</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Document Dialog */}
        <Dialog open={docOpen} onOpenChange={setDocOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editDocId ? "Editar Documento" : "Agregar Documento"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label>Nombre del documento *</Label>
                  <Input placeholder="SOAT, Revisión Técnica, Tarjeta de Propiedad..." value={docForm.nombre} onChange={(e) => setDocForm((f) => ({ ...f, nombre: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>N° / Código</Label>
                  <Input value={docForm.numero} onChange={(e) => setDocForm((f) => ({ ...f, numero: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Fecha de Emisión</Label>
                  <Input type="date" value={docForm.fechaEmision} onChange={(e) => setDocForm((f) => ({ ...f, fechaEmision: e.target.value }))} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Fecha de Vencimiento</Label>
                  <Input type="date" value={docForm.fechaVencimiento} onChange={(e) => setDocForm((f) => ({ ...f, fechaVencimiento: e.target.value }))} />
                  <p className="text-xs text-muted-foreground">Dejar vacío si no vence</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Notas</Label>
                  <Input value={docForm.notas} onChange={(e) => setDocForm((f) => ({ ...f, notas: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDocOpen(false)}>Cancelar</Button>
              <Button onClick={saveDoc}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Maintenance Dialog */}
        <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editMaintId ? "Editar Mantenimiento" : "Registrar Mantenimiento"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fecha *</Label>
                  <Input type="date" value={maintForm.fecha} onChange={(e) => setMaintForm((f) => ({ ...f, fecha: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Select value={maintForm.tipo} onValueChange={(v) => setMaintForm((f) => ({ ...f, tipo: v as MaintenanceRecord["tipo"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventivo">Preventivo</SelectItem>
                      <SelectItem value="correctivo">Correctivo</SelectItem>
                      <SelectItem value="revision">Revisión</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Descripción</Label>
                  <Textarea rows={2} value={maintForm.descripcion} onChange={(e) => setMaintForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Qué se hizo..." />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Piezas reemplazadas</Label>
                  <Input value={maintForm.piezasReemplazadas} onChange={(e) => setMaintForm((f) => ({ ...f, piezasReemplazadas: e.target.value }))} placeholder="Filtro de aceite, pastillas de freno..." />
                </div>
                <div className="space-y-1">
                  <Label>Proveedor / Taller</Label>
                  <Input value={maintForm.proveedor} onChange={(e) => setMaintForm((f) => ({ ...f, proveedor: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Costo (S/)</Label>
                  <Input type="number" value={maintForm.costo} onChange={(e) => setMaintForm((f) => ({ ...f, costo: e.target.value }))} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Próximo mantenimiento (fecha)</Label>
                  <Input type="date" value={maintForm.proximoMantenimiento} onChange={(e) => setMaintForm((f) => ({ ...f, proximoMantenimiento: e.target.value }))} />
                  <p className="text-xs text-muted-foreground">Se mostrará alerta cuando se acerque la fecha</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Notas adicionales</Label>
                  <Input value={maintForm.notas} onChange={(e) => setMaintForm((f) => ({ ...f, notas: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMaintOpen(false)}>Cancelar</Button>
              <Button onClick={saveMaint}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Document */}
        <AlertDialog open={!!deleteDocId} onOpenChange={() => setDeleteDocId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
                if (deleteDocId) { await deleteEquipmentDocument(deleteDocId); toast.success("Documento eliminado") }
                setDeleteDocId(null)
              }}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Maintenance */}
        <AlertDialog open={!!deleteMaintId} onOpenChange={() => setDeleteMaintId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle><AlertDialogDescription>Se eliminará este registro de mantenimiento.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
                if (deleteMaintId) { await deleteMaintenanceRecord(deleteMaintId); toast.success("Registro eliminado") }
                setDeleteMaintId(null)
              }}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipos</h1>
          <p className="text-sm text-muted-foreground">Lavadoras, carros y camiones — documentos y mantenimientos</p>
        </div>
        <Button onClick={openNewEq}><Plus className="h-4 w-4 mr-2" />Nuevo Equipo</Button>
      </div>

      {/* Alerts */}
      {alerts.expired.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Documentos vencidos o mantenimientos atrasados</p>
            <ul className="mt-1 space-y-0.5">
              {alerts.expired.map((a) => <li key={a} className="text-sm text-red-700">· {a}</li>)}
            </ul>
          </div>
        </div>
      )}
      {alerts.soon.length > 0 && (
        <div className="rounded-lg border border-orange-300 bg-orange-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-800">Próximos a vencer (≤30 días)</p>
            <ul className="mt-1 space-y-0.5">
              {alerts.soon.map((a) => <li key={a} className="text-sm text-orange-700">· {a}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Equipment grid */}
      {data.equipment.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No hay equipos registrados.</p>
          <Button className="mt-4" onClick={openNewEq}><Plus className="h-4 w-4 mr-2" />Registrar primer equipo</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.equipment.map((eq) => {
            const docs = data.equipmentDocuments.filter((d) => d.equipmentId === eq.id)
            const maints = data.maintenanceRecords.filter((m) => m.equipmentId === eq.id)
            const expiredDocs = docs.filter((d) => d.fechaVencimiento && (daysUntil(d.fechaVencimiento) ?? 99) < 0)
            const soonDocs = docs.filter((d) => d.fechaVencimiento && (daysUntil(d.fechaVencimiento) ?? 99) >= 0 && (daysUntil(d.fechaVencimiento) ?? 99) <= 30)
            const lastMaint = maints[0]
            const nextMaint = maints.find((m) => m.proximoMantenimiento)
            const nextMaintDays = nextMaint ? daysUntil(nextMaint.proximoMantenimiento) : null

            return (
              <Card
                key={eq.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedId(eq.id)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-muted shrink-0">
                        {tipoIcon(eq.tipo)}
                      </div>
                      <div>
                        <p className="font-semibold leading-tight">{eq.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {tipoLabel(eq.tipo)}
                          {eq.placa && ` · ${eq.placa}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {estadoBadge(eq.estado)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {(eq.marca || eq.modelo) && <p>{[eq.marca, eq.modelo].filter(Boolean).join(" ")} {eq.anio ? `(${eq.anio})` : ""}</p>}
                    {lastMaint && <p>Último mant.: {lastMaint.fecha}</p>}
                    {nextMaint && (
                      <p className={nextMaintDays !== null && nextMaintDays <= 30 ? "text-orange-600 font-medium" : ""}>
                        Próx. mant.: {nextMaint.proximoMantenimiento}
                        {nextMaintDays !== null && nextMaintDays <= 30 && ` (${nextMaintDays < 0 ? "atrasado" : `${nextMaintDays}d`})`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {expiredDocs.length > 0 && (
                      <Badge className="bg-red-100 text-red-700 border-red-300 text-[11px]">
                        <AlertCircle className="h-3 w-3 mr-1" />{expiredDocs.length} doc vencido
                      </Badge>
                    )}
                    {soonDocs.length > 0 && (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-[11px]">
                        <AlertTriangle className="h-3 w-3 mr-1" />{soonDocs.length} doc por vencer
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">{docs.length} doc · {maints.length} mant.</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Equipment Dialog */}
      <Dialog open={eqOpen} onOpenChange={setEqOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editEqId ? "Editar Equipo" : "Nuevo Equipo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input placeholder="Ej: Lavadora Industrial #1, Camión Rojo" value={eqForm.nombre} onChange={(e) => setEqForm((f) => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={eqForm.tipo} onValueChange={(v) => setEqForm((f) => ({ ...f, tipo: v as Equipment["tipo"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lavadora">Lavadora</SelectItem>
                    <SelectItem value="carro">Carro</SelectItem>
                    <SelectItem value="camion">Camión</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={eqForm.estado} onValueChange={(v) => setEqForm((f) => ({ ...f, estado: v as Equipment["estado"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="en_mantenimiento">En Mantenimiento</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Marca</Label>
                <Input value={eqForm.marca} onChange={(e) => setEqForm((f) => ({ ...f, marca: e.target.value }))} placeholder="Toyota, LG..." />
              </div>
              <div className="space-y-1">
                <Label>Modelo</Label>
                <Input value={eqForm.modelo} onChange={(e) => setEqForm((f) => ({ ...f, modelo: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Placa</Label>
                <Input value={eqForm.placa} onChange={(e) => setEqForm((f) => ({ ...f, placa: e.target.value }))} placeholder="Para vehículos" />
              </div>
              <div className="space-y-1">
                <Label>Año de fabricación</Label>
                <Input type="number" value={eqForm.anio} onChange={(e) => setEqForm((f) => ({ ...f, anio: e.target.value }))} placeholder="2020" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Fecha de adquisición</Label>
                <Input type="date" value={eqForm.fechaAdquisicion} onChange={(e) => setEqForm((f) => ({ ...f, fechaAdquisicion: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea rows={2} value={eqForm.notas} onChange={(e) => setEqForm((f) => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEqOpen(false)}>Cancelar</Button>
            <Button onClick={saveEq}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Equipment */}
      <AlertDialog open={!!deleteEqId} onOpenChange={() => setDeleteEqId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle><AlertDialogDescription>Se eliminarán también todos sus documentos y registros de mantenimiento.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
              if (deleteEqId) { await deleteEquipment(deleteEqId); toast.success("Equipo eliminado"); setSelectedId(null) }
              setDeleteEqId(null)
            }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
