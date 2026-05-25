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

/** Count Tuesdays (day 2) between two dates inclusive. */
function countTuesdays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0
  let count = 0
  const cur = new Date(startDate)
  const end = new Date(endDate)
  while (cur <= end) {
    if (cur.getDay() === 2) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
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
  const [empForm, setEmpForm] = useState({
    nombre: "", cargo: "", salarioBase: "", fechaIngreso: "",
    projectId: "", bonoMartes: "0",
  })
  const [empEstado, setEmpEstado] = useState<"activo" | "inactivo">("activo")
  const [deleteEmpId, setDeleteEmpId] = useState<string | null>(null)

  // ── Project filter in period detail ───────────────────────────────────────
  const [filterProjectId, setFilterProjectId] = useState<string>("todos")

  function openNewEmp() {
    setEditEmpId(null)
    setEmpForm({ nombre: "", cargo: "", salarioBase: "", fechaIngreso: "", projectId: "", bonoMartes: "0" })
    setEmpEstado("activo")
    setEmpOpen(true)
  }
  function openEditEmp(emp: Employee) {
    setEditEmpId(emp.id)
    setEmpForm({
      nombre: emp.nombre, cargo: emp.cargo,
      salarioBase: emp.salarioBase.toString(), fechaIngreso: emp.fechaIngreso,
      projectId: emp.projectId ?? "",
      bonoMartes: emp.bonoMartes.toString(),
    })
    setEmpEstado(emp.estado)
    setEmpOpen(true)
  }
  async function saveEmp() {
    if (!empForm.nombre.trim()) { toast.error("Nombre requerido"); return }
    const salario = parseFloat(empForm.salarioBase) || 0
    const bonoMartes = parseFloat(empForm.bonoMartes) || 0
    const projectId = empForm.projectId || null
    if (editEmpId) {
      await updateEmployee(editEmpId, empForm.nombre.trim(), empForm.cargo.trim(), salario, empForm.fechaIngreso, empEstado, 0, 0, projectId, bonoMartes)
      toast.success("Empleado actualizado")
    } else {
      await addEmployee(empForm.nombre.trim(), empForm.cargo.trim(), salario, empForm.fechaIngreso, 0, 0, projectId, bonoMartes)
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
    const period = await addPayrollPeriod(periodForm.nombre.trim(), periodForm.startDate, periodForm.endDate, periodForm.tipo)
    setPeriodOpen(false)

    // Auto-generar registros para todos los empleados activos
    if (activeEmployees.length > 0 && periodForm.startDate && periodForm.endDate) {
      const periodDays = calcPeriodDays(periodForm.startDate, periodForm.endDate)
      for (const emp of activeEmployees) {
        const bonoMartes = emp.bonoMartes > 0
          ? countTuesdays(periodForm.startDate, periodForm.endDate) * emp.bonoMartes
          : 0
        await upsertPayrollRecord(period.id, {
          employeeId: emp.id,
          salarioBase: emp.salarioBase,
          fechaInicioAsistencia: periodForm.startDate,
          fechaFinAsistencia: periodForm.endDate,
          diasTrabajados: periodDays,
          diasTotalesPeriodo: periodDays,
          horasExtra: 0,
          valorHoraExtra: 0,
          bonificaciones: bonoMartes,
          descuentoAfp: 0,
          descuentoSeguro: 0,
          adelantos: 0,
          otrosDescuentos: 0,
          pagado: false,
        })
      }
      toast.success(`Período creado con ${activeEmployees.length} empleado${activeEmployees.length !== 1 ? "s" : ""}`)
    } else {
      toast.success("Período creado")
    }
  }

  // ── Record state ──────────────────────────────────────────────────────────
  const [recordOpen, setRecordOpen] = useState(false)
  const [recordEmpId, setRecordEmpId] = useState<string | null>(null)
  const [recordForm, setRecordForm] = useState({
    salarioBase: "0",
    diasFaltados: "0",
    horasExtra: "0", valorHoraExtra: "0",
    bonificaciones: "0", adelantos: "0", otrosDescuentos: "0",
  })
  const [deleteRecordEmpId, setDeleteRecordEmpId] = useState<string | null>(null)

  // Tuesdays preview for the record dialog (uses period dates, not record dates)
  const recordEmp = data.employees.find((e) => e.id === recordEmpId)
  const martesBono = recordEmp && recordEmp.bonoMartes > 0 && selectedPeriod
    ? countTuesdays(selectedPeriod.startDate, selectedPeriod.endDate) * recordEmp.bonoMartes
    : 0

  function openRecord(emp: Employee) {
    if (!selectedPeriod) return
    const existing = selectedPeriod.records.find((r) => r.employeeId === emp.id)
    setRecordEmpId(emp.id)
    // Pre-fill bonificaciones with Tuesday bonus when no existing record
    const defaultBono = !existing && emp.bonoMartes > 0
      ? (countTuesdays(selectedPeriod.startDate, selectedPeriod.endDate) * emp.bonoMartes).toString()
      : (existing?.bonificaciones ?? 0).toString()
    const periodDays = calcPeriodDays(selectedPeriod.startDate, selectedPeriod.endDate)
    const diasFaltados = existing ? Math.max(0, periodDays - existing.diasTrabajados) : 0
    setRecordForm({
      salarioBase: (existing?.salarioBase ?? emp.salarioBase).toString(),
      diasFaltados: diasFaltados.toString(),
      horasExtra: (existing?.horasExtra ?? 0).toString(),
      valorHoraExtra: (existing?.valorHoraExtra ?? 0).toString(),
      bonificaciones: defaultBono,
      adelantos: (existing?.adelantos ?? 0).toString(),
      otrosDescuentos: (existing?.otrosDescuentos ?? 0).toString(),
    })
    setRecordOpen(true)
  }
  async function saveRecord() {
    if (!selectedPeriod || !recordEmpId) return
    const existing = selectedPeriod.records.find((r) => r.employeeId === recordEmpId)
    const periodDays = calcPeriodDays(selectedPeriod.startDate, selectedPeriod.endDate)
    const diasFaltados = Math.max(0, parseInt(recordForm.diasFaltados) || 0)
    const diasTrabajados = Math.max(0, periodDays - diasFaltados)
    await upsertPayrollRecord(selectedPeriod.id, {
      employeeId: recordEmpId,
      salarioBase: parseFloat(recordForm.salarioBase) || 0,
      fechaInicioAsistencia: selectedPeriod.startDate,
      fechaFinAsistencia: selectedPeriod.endDate,
      diasTrabajados,
      diasTotalesPeriodo: periodDays,
      horasExtra: parseFloat(recordForm.horasExtra) || 0,
      valorHoraExtra: parseFloat(recordForm.valorHoraExtra) || 0,
      bonificaciones: parseFloat(recordForm.bonificaciones) || 0,
      descuentoAfp: 0,
      descuentoSeguro: 0,
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
      const visibleEmps = filteredActiveEmployees
      let count = 0
      for (const emp of visibleEmps) {
        const existing = selectedPeriod.records.find((r) => r.employeeId === emp.id)
        const defaultBono = !existing && emp.bonoMartes > 0
          ? countTuesdays(selectedPeriod.startDate, selectedPeriod.endDate) * emp.bonoMartes
          : (existing?.bonificaciones ?? 0)
        await upsertPayrollRecord(selectedPeriod.id, {
          employeeId: emp.id,
          salarioBase: emp.salarioBase,
          fechaInicioAsistencia: selectedPeriod.startDate,
          fechaFinAsistencia: selectedPeriod.endDate,
          diasTrabajados: existing?.diasTrabajados ?? periodDays,
          diasTotalesPeriodo: periodDays,
          horasExtra: existing?.horasExtra ?? 0,
          valorHoraExtra: existing?.valorHoraExtra ?? 0,
          bonificaciones: defaultBono,
          descuentoAfp: 0,
          descuentoSeguro: 0,
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

  // ── Filtered employees for period detail ──────────────────────────────────
  const filteredActiveEmployees = useMemo(() => {
    if (!selectedPeriod || filterProjectId === "todos") return activeEmployees
    return activeEmployees.filter((e) => e.projectId === filterProjectId)
  }, [activeEmployees, filterProjectId, selectedPeriod])

  // ── Computed preview ──────────────────────────────────────────────────────
  const previewDiasTotales = selectedPeriod
    ? calcPeriodDays(selectedPeriod.startDate, selectedPeriod.endDate)
    : 30
  const previewDiasTrabajados = Math.max(0, previewDiasTotales - (parseInt(recordForm.diasFaltados) || 0))
  const preview = calcNeto(
    parseFloat(recordForm.salarioBase) || 0,
    previewDiasTrabajados,
    previewDiasTotales,
    parseFloat(recordForm.horasExtra) || 0,
    parseFloat(recordForm.valorHoraExtra) || 0,
    parseFloat(recordForm.bonificaciones) || 0,
    0,
    0,
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
    const totalBeneficios = filteredActiveEmployees.reduce((sum, emp) => {
      const rec = selectedPeriod.records.find((r) => r.employeeId === emp.id)
      return sum + calcBeneficios(rec?.salarioBase ?? emp.salarioBase).total
    }, 0)
    const benefTotals = filteredActiveEmployees.reduce((acc, emp) => {
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
                  Auto-completar{filterProjectId !== "todos" ? " Filtro" : " Período"}
                </Button>
                <Button variant="outline" onClick={() => setClosePeriodConfirm(true)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Cerrar Período
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filtro por proyecto/sucursal */}
        {data.projects.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Filtrar por sucursal:</span>
            <Select value={filterProjectId} onValueChange={setFilterProjectId}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los locales</SelectItem>
                {data.projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* KPIs — compactos */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: "Total Bruto", value: fmt(periodTotals.bruto), color: "" },
            { label: "Descuentos", value: fmt(periodTotals.desc), color: "text-red-600" },
            { label: "Neto a Pagar", value: fmt(periodTotals.neto), color: "text-green-600" },
            { label: "Ya Pagado", value: fmt(periodTotals.pagados), color: "text-green-700" },
            { label: "Pendiente", value: fmt(periodTotals.pendiente), color: "text-orange-600" },
            { label: "Costo Empleador", value: fmt(periodTotals.bruto + totalBeneficios), color: "text-blue-600" },
          ].map((k) => (
            <div key={k.label} className="rounded-lg border bg-card px-3 py-2">
              <p className="text-[11px] text-muted-foreground leading-tight">{k.label}</p>
              <p className={`text-sm font-bold mt-0.5 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs: Registros / Beneficios Sociales */}
        <Tabs defaultValue="registros">
          <TabsList>
            <TabsTrigger value="registros">Registros de Pago</TabsTrigger>
            <TabsTrigger value="beneficios">Beneficios Sociales</TabsTrigger>
          </TabsList>

          <TabsContent value="registros">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead className="text-right">Días Asist.</TableHead>
                      <TableHead className="text-right">Sal. Base</TableHead>
                      <TableHead className="text-right">Bruto</TableHead>
                      <TableHead className="text-right">Descuentos</TableHead>
                      <TableHead className="text-right">Neto</TableHead>
                      <TableHead className="text-center">Pagado</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActiveEmployees.map((emp) => {
                      const rec = selectedPeriod.records.find((r) => r.employeeId === emp.id)
                      const calc = rec ? calcNeto(rec.salarioBase, rec.diasTrabajados, rec.diasTotalesPeriodo || periodDaysTotal, rec.horasExtra, rec.valorHoraExtra, rec.bonificaciones, rec.descuentoAfp, rec.descuentoSeguro, rec.adelantos, rec.otrosDescuentos) : null
                      const proyecto = emp.projectId ? data.projects.find((p) => p.id === emp.projectId) : null
                      return (
                        <TableRow key={emp.id} className={rec?.pagado ? "opacity-60" : ""}>
                          <TableCell className="font-medium">
                            {emp.nombre}
                            {emp.bonoMartes > 0 && <Badge variant="outline" className="ml-2 text-xs">Mina</Badge>}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {proyecto?.name ?? <span className="text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {rec ? (
                              <span className="text-xs">
                                <span className="font-medium">{rec.diasTrabajados}/{periodDaysTotal}d</span>
                                {(periodDaysTotal - rec.diasTrabajados) > 0 && (
                                  <span className="ml-1 text-orange-600">({periodDaysTotal - rec.diasTrabajados} faltó)</span>
                                )}
                              </span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-right">{fmt(rec?.salarioBase ?? emp.salarioBase)}</TableCell>
                          <TableCell className="text-right">{calc ? fmt(calc.bruto) : "—"}</TableCell>
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
                                {rec.pagado ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
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
                    {filteredActiveEmployees.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No hay empleados activos{filterProjectId !== "todos" ? " en esta sucursal" : ""}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="beneficios">
            <Card>
              <CardHeader className="pb-2">
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
                    {filteredActiveEmployees.map((emp) => {
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
                    {filteredActiveEmployees.length > 0 && (
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
          </TabsContent>
        </Tabs>

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
              {/* Asistencia — días faltados */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Asistencia</p>
                <div className="space-y-1">
                  <Label>Días faltados</Label>
                  <Input
                    type="number" min="0" max={previewDiasTotales}
                    value={recordForm.diasFaltados}
                    onChange={(e) => setRecordForm((f) => ({ ...f, diasFaltados: e.target.value }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Días trabajados: <span className="font-semibold text-foreground">{previewDiasTrabajados}</span>
                  {" / "}{previewDiasTotales} días del período
                  {parseInt(recordForm.diasFaltados) > 0 && (
                    <span className="ml-2 text-orange-600">
                      · Descuento: {fmt((parseFloat(recordForm.salarioBase) || 0) / previewDiasTotales * (parseInt(recordForm.diasFaltados) || 0))}
                    </span>
                  )}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Salario Base (S/)</Label><Input type="number" value={recordForm.salarioBase} onChange={(e) => setRecordForm((f) => ({ ...f, salarioBase: e.target.value }))} /></div>
                <div className="space-y-1">
                  <Label>Bonificaciones (S/)</Label>
                  <Input type="number" value={recordForm.bonificaciones} onChange={(e) => setRecordForm((f) => ({ ...f, bonificaciones: e.target.value }))} />
                  {recordEmp && recordEmp.bonoMartes > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Bono mina: {martesBono > 0 ? fmt(martesBono) : "—"}
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descuentos</p>
                <div className="grid grid-cols-2 gap-3">
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
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="text-right">Sal. Base</TableHead>
                    <TableHead className="text-right">Bono Mina</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.employees.map((emp) => {
                    const proyecto = emp.projectId ? data.projects.find((p) => p.id === emp.projectId) : null
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">{emp.cargo || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{proyecto?.name ?? "—"}</TableCell>
                        <TableCell className="text-right">{fmt(emp.salarioBase)}</TableCell>
                        <TableCell className="text-right">
                          {emp.bonoMartes > 0
                            ? <span className="text-blue-600 font-medium">{fmt(emp.bonoMartes)}/martes</span>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
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
                    )
                  })}
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
            {/* Sucursal / Proyecto */}
            <div className="space-y-1">
              <Label>Sucursal / Local</Label>
              <Select value={empForm.projectId || "ninguno"} onValueChange={(v) => setEmpForm((f) => ({ ...f, projectId: v === "ninguno" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Sin asignar</SelectItem>
                  {data.projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {data.projects.length === 0 && (
                <p className="text-xs text-muted-foreground">Crea proyectos/locales en la sección Proyectos.</p>
              )}
            </div>
            {/* Bono mina */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bono Especial</p>
              <div className="space-y-1">
                <Label>Bono por martes trabajado (S/)</Label>
                <Input type="number" value={empForm.bonoMartes} onChange={(e) => setEmpForm((f) => ({ ...f, bonoMartes: e.target.value }))} placeholder="0" />
                <p className="text-xs text-muted-foreground">Para trabajadores de mina. Se calcula automáticamente al generar la planilla.</p>
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
