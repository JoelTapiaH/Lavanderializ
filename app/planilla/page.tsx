"use client"

import { useState, useMemo } from "react"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, ChevronLeft, Lock, UserPlus, AlertCircle, RefreshCw, CheckCircle2, Circle } from "lucide-react"
import { toast } from "sonner"
import type { Employee } from "@/lib/types"

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Returns the total number of calendar days in a period (inclusive). */
function calcPeriodDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 30
  const diff = Math.round(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1
  return Math.max(1, diff)
}

function calcNeto(
  salarioBase: number, diasTrabajados: number, diasTotalesPeriodo: number,
  horasExtra: number, valorHoraExtra: number, bonificaciones: number,
  descuentoAfp: number, descuentoFijo: number, adelantos: number, otrosDescuentos: number
): { bruto: number; totalDesc: number; neto: number } {
  const total = diasTotalesPeriodo > 0 ? diasTotalesPeriodo : 30
  const bruto = (salarioBase / total) * diasTrabajados + horasExtra * valorHoraExtra + bonificaciones
  const descAfp = bruto * (descuentoAfp / 100)
  const totalDesc = descAfp + descuentoFijo + adelantos + otrosDescuentos
  return { bruto, totalDesc, neto: Math.max(0, bruto - totalDesc) }
}

function calcBeneficios(salarioBase: number) {
  const essalud = salarioBase * 0.09
  const cts = salarioBase / 12
  const gratificacion = salarioBase / 6
  const vacaciones = salarioBase / 12
  return { essalud, cts, gratificacion, vacaciones, total: essalud + cts + gratificacion + vacaciones }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlanillaPage() {
  const {
    data,
    addEmployee, updateEmployee, deleteEmployee,
    addPayrollPeriod, deletePayrollPeriod, closePayrollPeriod,
    upsertPayrollRecord, deletePayrollRecord, markPayrollRecordPaid,
  } = useStore()

  const today = new Date().toISOString().split("T")[0]
  const activeEmployees = data.employees.filter((e) => e.estado === "activo")
  const paymentsDue = data.payrollPeriods.filter(
    (p) => p.estado === "abierto" && p.endDate && p.endDate < today
  )

  // ── Navigation ────────────────────────────────────────────────────────────
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const selectedPeriod = data.payrollPeriods.find((p) => p.id === selectedPeriodId) ?? null

  // ── Employee state ────────────────────────────────────────────────────────
  const [empOpen, setEmpOpen] = useState(false)
  const [editEmpId, setEditEmpId] = useState<string | null>(null)
  const [empForm, setEmpForm] = useState({ nombre: "", cargo: "", salarioBase: "", fechaIngreso: "", afpPct: "13", descFijo: "0" })
  const [empEstado, setEmpEstado] = useState<"activo" | "inactivo">("activo")
  const [deleteEmpId, setDeleteEmpId] = useState<string | null>(null)

  function openNewEmp() {
    setEditEmpId(null)
    setEmpForm({ nombre: "", cargo: "", salarioBase: "", fechaIngreso: "", afpPct: "13", descFijo: "0" })
    setEmpEstado("activo")
    setEmpOpen(true)
  }
  function openEditEmp(emp: Employee) {
    setEditEmpId(emp.id)
    setEmpForm({
      nombre: emp.nombre, cargo: emp.cargo,
      salarioBase: emp.salarioBase.toString(), fechaIngreso: emp.fechaIngreso,
      afpPct: emp.afpPct.toString(), descFijo: emp.descFijo.toString(),
    })
    setEmpEstado(emp.estado)
    setEmpOpen(true)
  }
  async function saveEmp() {
    if (!empForm.nombre.trim()) { toast.error("Nombre requerido"); return }
    const salario = parseFloat(empForm.salarioBase) || 0
    const afpPct = parseFloat(empForm.afpPct) || 0
    const descFijo = parseFloat(empForm.descFijo) || 0
    if (editEmpId) {
      await updateEmployee(editEmpId, empForm.nombre.trim(), empForm.cargo.trim(), salario, empForm.fechaIngreso, empEstado, afpPct, descFijo)
      toast.success("Empleado actualizado")
    } else {
      await addEmployee(empForm.nombre.trim(), empForm.cargo.trim(), salario, empForm.fechaIngreso, afpPct, descFijo)
      toast.success("Empleado agregado")
    }
    setEmpOpen(false)
  }


  // ── Period state ──────────────────────────────────────────────────────────
  const [periodOpen, setPeriodOpen] = useState(false)
  const [periodForm, setPeriodForm] = useState({ nombre: "", startDate: "", endDate: "", tipo: "mensual" as "quincenal" | "mensual" })
  const [deletePeriodId, setDeletePeriodId] = useState<string | null>(null)
  const [closePeriodConfirm, setClosePeriodConfirm] = useState(false)

  async function savePeriod() {
    if (!periodForm.nombre.trim()) { toast.error("Nombre requerido"); return }
    await addPayrollPeriod(periodForm.nombre.trim(), periodForm.startDate, periodForm.endDate, periodForm.tipo)
    toast.success("Período creado")
    setPeriodOpen(false)
  }

  // ── Record state ──────────────────────────────────────────────────────────
  const [recordOpen, setRecordOpen] = useState(false)
  const [recordEmpId, setRecordEmpId] = useState<string | null>(null)
  const [recordForm, setRecordForm] = useState({
    salarioBase: "0",
    fechaInicioAsistencia: "", fechaFinAsistencia: "",
    horasExtra: "0", valorHoraExtra: "0",
    bonificaciones: "0", afpPct: "13", descFijo: "0", adelantos: "0", otrosDescuentos: "0",
  })
  const [deleteRecordEmpId, setDeleteRecordEmpId] = useState<string | null>(null)

  function openRecord(emp: Employee) {
    if (!selectedPeriod) return
    const existing = selectedPeriod.records.find((r) => r.employeeId === emp.id)
    setRecordEmpId(emp.id)
    setRecordForm({
      salarioBase: (existing?.salarioBase ?? emp.salarioBase).toString(),
      fechaInicioAsistencia: existing?.fechaInicioAsistencia || selectedPeriod.startDate,
      fechaFinAsistencia: existing?.fechaFinAsistencia || selectedPeriod.endDate,
      horasExtra: (existing?.horasExtra ?? 0).toString(),
      valorHoraExtra: (existing?.valorHoraExtra ?? 0).toString(),
      bonificaciones: (existing?.bonificaciones ?? 0).toString(),
      afpPct: (existing?.descuentoAfp ?? emp.afpPct).toString(),
      descFijo: (existing?.descuentoSeguro ?? emp.descFijo).toString(),
      adelantos: (existing?.adelantos ?? 0).toString(),
      otrosDescuentos: (existing?.otrosDescuentos ?? 0).toString(),
    })
    setRecordOpen(true)
  }
  async function saveRecord() {
    if (!selectedPeriod || !recordEmpId) return
    if (!recordForm.fechaInicioAsistencia || !recordForm.fechaFinAsistencia) {
      toast.error("Ingresa las fechas de asistencia"); return
    }
    const existing = selectedPeriod.records.find((r) => r.employeeId === recordEmpId)
    const periodDays = calcPeriodDays(selectedPeriod.startDate, selectedPeriod.endDate)
    const diasTrabajados = calcPeriodDays(recordForm.fechaInicioAsistencia, recordForm.fechaFinAsistencia)
    await upsertPayrollRecord(selectedPeriod.id, {
      employeeId: recordEmpId,
      salarioBase: parseFloat(recordForm.salarioBase) || 0,
      fechaInicioAsistencia: recordForm.fechaInicioAsistencia,
      fechaFinAsistencia: recordForm.fechaFinAsistencia,
      diasTrabajados,
      diasTotalesPeriodo: periodDays,
      horasExtra: parseFloat(recordForm.horasExtra) || 0,
      valorHoraExtra: parseFloat(recordForm.valorHoraExtra) || 0,
      bonificaciones: parseFloat(recordForm.bonificaciones) || 0,
      descuentoAfp: parseFloat(recordForm.afpPct) || 0,
      descuentoSeguro: parseFloat(recordForm.descFijo) || 0,
      adelantos: parseFloat(recordForm.adelantos) || 0,
      otrosDescuentos: parseFloat(recordForm.otrosDescuentos) || 0,
      pagado: existing?.pagado ?? false,
    })
    toast.success("Registro guardado")
    setRecordOpen(false)
  }

  // ── Auto-fill all employees with full period range ────────────────────────
  const [generating, setGenerating] = useState(false)

  async function generateAllRecords() {
    if (!selectedPeriod || !selectedPeriod.startDate || !selectedPeriod.endDate) {
      toast.error("El período necesita fecha de inicio y fin"); return
    }
    setGenerating(true)
    try {
      const periodDays = calcPeriodDays(selectedPeriod.startDate, selectedPeriod.endDate)
      let count = 0
      for (const emp of activeEmployees) {
        const existing = selectedPeriod.records.find((r) => r.employeeId === emp.id)
        await upsertPayrollRecord(selectedPeriod.id, {
          employeeId: emp.id,
          salarioBase: emp.salarioBase,
          fechaInicioAsistencia: existing?.fechaInicioAsistencia || selectedPeriod.startDate,
          fechaFinAsistencia: existing?.fechaFinAsistencia || selectedPeriod.endDate,
          diasTrabajados: existing?.diasTrabajados ?? periodDays,
          diasTotalesPeriodo: periodDays,
          horasExtra: existing?.horasExtra ?? 0,
          valorHoraExtra: existing?.valorHoraExtra ?? 0,
          bonificaciones: existing?.bonificaciones ?? 0,
          descuentoAfp: emp.afpPct,
          descuentoSeguro: emp.descFijo,
          adelantos: existing?.adelantos ?? 0,
          otrosDescuentos: existing?.otrosDescuentos ?? 0,
          pagado: existing?.pagado ?? false,
        })
        count++
      }
      toast.success(`Planilla generada para ${count} empleado${count !== 1 ? "s" : ""}`)
    } finally {
      setGenerating(false)
    }
  }

  // ── Computed preview ──────────────────────────────────────────────────────
  const previewDiasTrabajados = calcPeriodDays(recordForm.fechaInicioAsistencia, recordForm.fechaFinAsistencia)
  const previewDiasTotales = selectedPeriod
    ? calcPeriodDays(selectedPeriod.startDate, selectedPeriod.endDate)
    : 30
  const preview = calcNeto(
    parseFloat(recordForm.salarioBase) || 0,
    previewDiasTrabajados,
    previewDiasTotales,
    parseFloat(recordForm.horasExtra) || 0,
    parseFloat(recordForm.valorHoraExtra) || 0,
    parseFloat(recordForm.bonificaciones) || 0,
    parseFloat(recordForm.afpPct) || 0,
    parseFloat(recordForm.descFijo) || 0,
    parseFloat(recordForm.adelantos) || 0,
    parseFloat(recordForm.otrosDescuentos) || 0,
  )

  const periodTotals = useMemo(() => {
    if (!selectedPeriod) return { bruto: 0, desc: 0, neto: 0, pagados: 0, pendiente: 0 }
    return selectedPeriod.records.reduce((acc, r) => {
      const c = calcNeto(r.salarioBase, r.diasTrabajados, r.diasTotalesPeriodo, r.horasExtra, r.valorHoraExtra, r.bonificaciones, r.descuentoAfp, r.descuentoSeguro, r.adelantos, r.otrosDescuentos)
      return {
        bruto: acc.bruto + c.bruto,
        desc: acc.desc + c.totalDesc,
        neto: acc.neto + c.neto,
        pagados: acc.pagados + (r.pagado ? c.neto : 0),
        pendiente: acc.pendiente + (!r.pagado ? c.neto : 0),
      }
    }, { bruto: 0, desc: 0, neto: 0, pagados: 0, pendiente: 0 })
  }, [selectedPeriod])

  // ── PERIOD DETAIL VIEW ────────────────────────────────────────────────────
  if (selectedPeriod) {
    const totalBeneficios = activeEmployees.reduce((sum, emp) => {
      const rec = selectedPeriod.records.find((r) => r.employeeId === emp.id)
      return sum + calcBeneficios(rec?.salarioBase ?? emp.salarioBase).total
    }, 0)
    const benefTotals = activeEmployees.reduce((acc, emp) => {
      const rec = selectedPeriod.records.find((r) => r.employeeId === emp.id)
      const b = calcBeneficios(rec?.salarioBase ?? emp.salarioBase)
      return { essalud: acc.essalud + b.essalud, cts: acc.cts + b.cts, gratificacion: acc.gratificacion + b.gratificacion, vacaciones: acc.vacaciones + b.vacaciones, total: acc.total + b.total }
    }, { essalud: 0, cts: 0, gratificacion: 0, vacaciones: 0, total: 0 })

    const periodDaysTotal = calcPeriodDays(selectedPeriod.startDate, selectedPeriod.endDate)

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedPeriodId(null)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{selectedPeriod.nombre}</h1>
              <p className="text-sm text-muted-foreground">
                {selectedPeriod.startDate || "—"} → {selectedPeriod.endDate || "—"} · {selectedPeriod.tipo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={selectedPeriod.estado === "abierto" ? "default" : "secondary"}>
              {selectedPeriod.estado === "abierto" ? "Abierto" : "Cerrado"}
            </Badge>
            {selectedPeriod.estado === "abierto" && (
              <>
                <Button variant="outline" disabled={generating} onClick={generateAllRecords}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} />
                  Auto-completar Período
                </Button>
                <Button variant="outline" onClick={() => setClosePeriodConfirm(true)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Cerrar Período
                </Button>
              </>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Bruto</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{fmt(periodTotals.bruto)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Descuentos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-red-600">{fmt(periodTotals.desc)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Neto a Pagar</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">{fmt(periodTotals.neto)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ya Pagado</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-700">{fmt(periodTotals.pagados)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pendiente</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-orange-600">{fmt(periodTotals.pendiente)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Costo Empleador</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-blue-600">{fmt(periodTotals.bruto + totalBeneficios)}</p></CardContent>
          </Card>
        </div>

        {/* Registros de pago */}
        <Card>
          <CardHeader><CardTitle className="text-base">Registros de Pago</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="text-right">Días Asist.</TableHead>
                  <TableHead className="text-right">Sal. Base</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">AFP/ONP</TableHead>
                  <TableHead className="text-right">Desc. Fijo</TableHead>
                  <TableHead className="text-right">Otros</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-center">Pagado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEmployees.map((emp) => {
                  const rec = selectedPeriod.records.find((r) => r.employeeId === emp.id)
                  const calc = rec ? calcNeto(rec.salarioBase, rec.diasTrabajados, rec.diasTotalesPeriodo || periodDaysTotal, rec.horasExtra, rec.valorHoraExtra, rec.bonificaciones, rec.descuentoAfp, rec.descuentoSeguro, rec.adelantos, rec.otrosDescuentos) : null
                  return (
                    <TableRow key={emp.id} className={rec?.pagado ? "opacity-60" : ""}>
                      <TableCell className="font-medium">{emp.nombre}</TableCell>
                      <TableCell className="text-right">
                        {rec?.fechaInicioAsistencia && rec?.fechaFinAsistencia ? (
                          <span className="font-medium text-xs">
                            {rec.fechaInicioAsistencia} → {rec.fechaFinAsistencia}
                            <span className="ml-1 text-muted-foreground">({rec.diasTrabajados}/{periodDaysTotal}d)</span>
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">{fmt(rec?.salarioBase ?? emp.salarioBase)}</TableCell>
                      <TableCell className="text-right">{calc ? fmt(calc.bruto) : "—"}</TableCell>
                      <TableCell className="text-right text-red-600">
                        {rec ? `${rec.descuentoAfp}%` : `${emp.afpPct}%`}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {rec ? fmt(rec.descuentoSeguro) : fmt(emp.descFijo)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {rec ? fmt(rec.adelantos + rec.otrosDescuentos) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">{calc ? fmt(calc.neto) : "—"}</TableCell>
                      <TableCell className="text-center">
                        {rec ? (
                          <Button
                            size="icon" variant="ghost"
                            className={rec.pagado ? "text-green-600" : "text-muted-foreground"}
                            title={rec.pagado ? "Pagado — clic para marcar pendiente" : "Pendiente — clic para marcar pagado"}
                            onClick={() => markPayrollRecordPaid(selectedPeriod.id, rec.id, !rec.pagado)}
                          >
                            {rec.pagado
                              ? <CheckCircle2 className="h-5 w-5" />
                              : <Circle className="h-5 w-5" />}
                          </Button>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {selectedPeriod.estado === "abierto" && (
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openRecord(emp)}><Pencil className="h-4 w-4" /></Button>
                            {rec && <Button size="icon" variant="ghost" className="text-red-500" onClick={() => setDeleteRecordEmpId(emp.id)}><Trash2 className="h-4 w-4" /></Button>}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {activeEmployees.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No hay empleados activos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Beneficios Sociales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Beneficios Sociales — Costo del Empleador</CardTitle>
            <p className="text-xs text-muted-foreground">Provisiones mensuales estimadas. No se descuentan del neto del trabajador.</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="text-right">ESSALUD (9%)</TableHead>
                  <TableHead className="text-right">CTS</TableHead>
                  <TableHead className="text-right">Gratificación</TableHead>
                  <TableHead className="text-right">Vacaciones</TableHead>
                  <TableHead className="text-right">Total Provisión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEmployees.map((emp) => {
                  const rec = selectedPeriod.records.find((r) => r.employeeId === emp.id)
                  const b = calcBeneficios(rec?.salarioBase ?? emp.salarioBase)
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.nombre}</TableCell>
                      <TableCell className="text-right">{fmt(b.essalud)}</TableCell>
                      <TableCell className="text-right">{fmt(b.cts)}</TableCell>
                      <TableCell className="text-right">{fmt(b.gratificacion)}</TableCell>
                      <TableCell className="text-right">{fmt(b.vacaciones)}</TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">{fmt(b.total)}</TableCell>
                    </TableRow>
                  )
                })}
                {activeEmployees.length > 0 && (
                  <TableRow className="border-t-2 font-bold bg-muted/40">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{fmt(benefTotals.essalud)}</TableCell>
                    <TableCell className="text-right">{fmt(benefTotals.cts)}</TableCell>
                    <TableCell className="text-right">{fmt(benefTotals.gratificacion)}</TableCell>
                    <TableCell className="text-right">{fmt(benefTotals.vacaciones)}</TableCell>
                    <TableCell className="text-right text-blue-600">{fmt(benefTotals.total)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialogs — period detail */}
        <AlertDialog open={closePeriodConfirm} onOpenChange={setClosePeriodConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cerrar este período?</AlertDialogTitle>
              <AlertDialogDescription>Una vez cerrado no podrás modificar los registros.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                await closePayrollPeriod(selectedPeriod.id)
                toast.success("Período cerrado")
                setClosePeriodConfirm(false)
              }}>Cerrar Período</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteRecordEmpId} onOpenChange={() => setDeleteRecordEmpId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
              <AlertDialogDescription>Se eliminará el registro de planilla de este empleado.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
                const rec = selectedPeriod.records.find((r) => r.employeeId === deleteRecordEmpId)
                if (rec) { await deletePayrollRecord(selectedPeriod.id, rec.id); toast.success("Registro eliminado") }
                setDeleteRecordEmpId(null)
              }}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Record edit dialog */}
        <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{data.employees.find((e) => e.id === recordEmpId)?.nombre ?? "Empleado"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Asistencia — rango de fechas */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Asistencia</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Fecha inicio *</Label>
                    <Input type="date" value={recordForm.fechaInicioAsistencia}
                      onChange={(e) => setRecordForm((f) => ({ ...f, fechaInicioAsistencia: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Fecha fin *</Label>
                    <Input type="date" value={recordForm.fechaFinAsistencia}
                      onChange={(e) => setRecordForm((f) => ({ ...f, fechaFinAsistencia: e.target.value }))} />
                  </div>
                </div>
                {recordForm.fechaInicioAsistencia && recordForm.fechaFinAsistencia && (
                  <p className="text-xs text-muted-foreground">
                    Días asistidos: <span className="font-semibold text-foreground">{previewDiasTrabajados}</span>
                    {" / "}{previewDiasTotales} días del período
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Salario Base (S/)</Label><Input type="number" value={recordForm.salarioBase} onChange={(e) => setRecordForm((f) => ({ ...f, salarioBase: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Horas Extra</Label><Input type="number" value={recordForm.horasExtra} onChange={(e) => setRecordForm((f) => ({ ...f, horasExtra: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Valor Hora Extra (S/)</Label><Input type="number" value={recordForm.valorHoraExtra} onChange={(e) => setRecordForm((f) => ({ ...f, valorHoraExtra: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Bonificaciones (S/)</Label><Input type="number" value={recordForm.bonificaciones} onChange={(e) => setRecordForm((f) => ({ ...f, bonificaciones: e.target.value }))} /></div>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descuentos</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>AFP / ONP (%)</Label><Input type="number" value={recordForm.afpPct} onChange={(e) => setRecordForm((f) => ({ ...f, afpPct: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Desc. Fijo (S/)</Label><Input type="number" value={recordForm.descFijo} onChange={(e) => setRecordForm((f) => ({ ...f, descFijo: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Adelantos (S/)</Label><Input type="number" value={recordForm.adelantos} onChange={(e) => setRecordForm((f) => ({ ...f, adelantos: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Otros Desc. (S/)</Label><Input type="number" value={recordForm.otrosDescuentos} onChange={(e) => setRecordForm((f) => ({ ...f, otrosDescuentos: e.target.value }))} /></div>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Sueldo Bruto</span><span className="font-medium">{fmt(preview.bruto)}</span></div>
                <div className="flex justify-between text-red-600"><span>Total Descuentos</span><span>- {fmt(preview.totalDesc)}</span></div>
                <div className="flex justify-between font-bold text-green-600 border-t pt-1 mt-1"><span>Neto a Pagar</span><span>{fmt(preview.neto)}</span></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRecordOpen(false)}>Cancelar</Button>
              <Button onClick={saveRecord}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planilla de Personal</h1>
        <p className="text-sm text-muted-foreground">Gestión de empleados, asistencia y períodos de pago</p>
      </div>

      {paymentsDue.length > 0 && (
        <div className="rounded-lg border border-orange-300 bg-orange-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-800">
              {paymentsDue.length === 1 ? "Tienes 1 período" : `Tienes ${paymentsDue.length} períodos`} con pago pendiente
            </p>
            <p className="text-sm text-orange-700 mt-0.5">
              {paymentsDue.map((p) => p.nombre).join(", ")} — fecha de fin vencida y período aún abierto.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="empleados">
        <TabsList>
          <TabsTrigger value="empleados">Empleados ({data.employees.length})</TabsTrigger>
          <TabsTrigger value="periodos">Períodos ({data.payrollPeriods.length})</TabsTrigger>
        </TabsList>

        {/* ── EMPLEADOS ──────────────────────────────────────────────────────── */}
        <TabsContent value="empleados" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewEmp}><UserPlus className="h-4 w-4 mr-2" />Nuevo Empleado</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right">Sal. Base</TableHead>
                    <TableHead className="text-right">AFP/ONP</TableHead>
                    <TableHead className="text-right">Desc. Fijo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.cargo || "—"}</TableCell>
                      <TableCell className="text-right">{fmt(emp.salarioBase)}</TableCell>
                      <TableCell className="text-right text-red-600">{emp.afpPct}%</TableCell>
                      <TableCell className="text-right text-red-600">{fmt(emp.descFijo)}</TableCell>
                      <TableCell>
                        <Badge variant={emp.estado === "activo" ? "default" : "secondary"}>
                          {emp.estado === "activo" ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditEmp(emp)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-red-500" onClick={() => setDeleteEmpId(emp.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.employees.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay empleados registrados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PERÍODOS ───────────────────────────────────────────────────────── */}
        <TabsContent value="periodos" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setPeriodForm({ nombre: "", startDate: "", endDate: "", tipo: "mensual" }); setPeriodOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />Nuevo Período
            </Button>
          </div>
          <div className="space-y-3">
            {data.payrollPeriods.map((period) => {
              const periodDays = calcPeriodDays(period.startDate, period.endDate)
              const neto = period.records.reduce((sum, r) => {
                const { neto } = calcNeto(r.salarioBase, r.diasTrabajados, r.diasTotalesPeriodo || periodDays, r.horasExtra, r.valorHoraExtra, r.bonificaciones, r.descuentoAfp, r.descuentoSeguro, r.adelantos, r.otrosDescuentos)
                return sum + neto
              }, 0)
              const isDue = period.estado === "abierto" && period.endDate && period.endDate < today
              return (
                <Card key={period.id} className={`cursor-pointer hover:border-primary/50 transition-colors ${isDue ? "border-orange-300" : ""}`} onClick={() => setSelectedPeriodId(period.id)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{period.nombre}</span>
                        <Badge variant="outline" className="text-xs">{period.tipo}</Badge>
                        <Badge variant={period.estado === "abierto" ? "default" : "secondary"} className="text-xs">{period.estado}</Badge>
                        {isDue && <Badge className="text-xs bg-orange-500 text-white">Pago pendiente</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {period.startDate || "—"} → {period.endDate || "—"} · {period.records.length} empleados
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Neto Total</p>
                        <p className="font-bold text-green-600">{fmt(neto)}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="text-red-500" onClick={(e) => { e.stopPropagation(); setDeletePeriodId(period.id) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {data.payrollPeriods.length === 0 && (
              <div className="text-center text-muted-foreground py-12">No hay períodos creados</div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── DIALOGS ────────────────────────────────────────────────────────────── */}

      {/* Employee dialog */}
      <Dialog open={empOpen} onOpenChange={setEmpOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editEmpId ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nombre *</Label><Input value={empForm.nombre} onChange={(e) => setEmpForm((f) => ({ ...f, nombre: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Cargo</Label><Input value={empForm.cargo} onChange={(e) => setEmpForm((f) => ({ ...f, cargo: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Salario Base (S/)</Label><Input type="number" value={empForm.salarioBase} onChange={(e) => setEmpForm((f) => ({ ...f, salarioBase: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Fecha de Ingreso</Label><Input type="date" value={empForm.fechaIngreso} onChange={(e) => setEmpForm((f) => ({ ...f, fechaIngreso: e.target.value }))} /></div>
            </div>
            {/* Descuentos por ley */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descuentos por Ley</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>AFP / ONP (%)</Label>
                  <Input type="number" value={empForm.afpPct} onChange={(e) => setEmpForm((f) => ({ ...f, afpPct: e.target.value }))} placeholder="13" />
                  <p className="text-xs text-muted-foreground">AFP ≈ 13% · ONP = 13%</p>
                </div>
                <div className="space-y-1">
                  <Label>Desc. Fijo mensual (S/)</Label>
                  <Input type="number" value={empForm.descFijo} onChange={(e) => setEmpForm((f) => ({ ...f, descFijo: e.target.value }))} placeholder="0" />
                  <p className="text-xs text-muted-foreground">Adelantos fijos u otros</p>
                </div>
              </div>
            </div>
            {editEmpId && (
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={empEstado} onValueChange={(v) => setEmpEstado(v as "activo" | "inactivo")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpOpen(false)}>Cancelar</Button>
            <Button onClick={saveEmp}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteEmpId} onOpenChange={() => setDeleteEmpId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
              if (!deleteEmpId) return
              await deleteEmployee(deleteEmpId); toast.success("Empleado eliminado"); setDeleteEmpId(null)
            }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Period dialog */}
      <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Período de Planilla</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nombre *</Label><Input placeholder="Ej: Planilla Marzo 2026" value={periodForm.nombre} onChange={(e) => setPeriodForm((f) => ({ ...f, nombre: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Fecha Inicio</Label><Input type="date" value={periodForm.startDate} onChange={(e) => setPeriodForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Fecha Fin</Label><Input type="date" value={periodForm.endDate} onChange={(e) => setPeriodForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={periodForm.tipo} onValueChange={(v) => setPeriodForm((f) => ({ ...f, tipo: v as "quincenal" | "mensual" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodOpen(false)}>Cancelar</Button>
            <Button onClick={savePeriod}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePeriodId} onOpenChange={() => setDeletePeriodId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar período?</AlertDialogTitle><AlertDialogDescription>Se eliminarán todos los registros asociados.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => {
              if (!deletePeriodId) return
              await deletePayrollPeriod(deletePeriodId); toast.success("Período eliminado"); setDeletePeriodId(null)
            }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
