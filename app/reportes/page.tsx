
"use client"

import { useMemo } from "react"
import { useStore } from "@/lib/store"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Receipt, Package, TrendingUp, Building2, Users, CheckCircle2, Clock } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function ReportesPage() {
  const { data } = useStore()

  // Helper: get effective price for a garment type within a project
  function getEffectivePrice(garmentTypeId: string, projectId: string | null): number {
    if (projectId) {
      const override = data.projectGarmentPrices.find(
        p => p.projectId === projectId && p.garmentTypeId === garmentTypeId
      )
      if (override) return override.pricePerUnit
    }
    return data.garmentTypes.find(g => g.id === garmentTypeId)?.pricePerUnit ?? 0
  }

  // Helper: total prendas from guias for a period
  function totalGuiasPrendas(period: typeof data.valorizaciones[0]): number {
    return period.guias.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.quantity, 0), 0)
  }

  // Helper: total prendas from actas for a period
  function totalActasPrendas(period: typeof data.valorizaciones[0]): number {
    return period.actas.reduce((sum, a) => sum + a.items.reduce((s, i) => s + i.quantity, 0), 0)
  }

  // Helper: total importe for a period (from guias, with effective prices)
  function totalImporte(period: typeof data.valorizaciones[0]): number {
    let total = 0
    for (const guia of period.guias) {
      for (const item of guia.items) {
        total += item.quantity * getEffectivePrice(item.garmentTypeId, period.projectId)
      }
    }
    return total
  }

  const sortedPeriods = useMemo(
    () => [...data.valorizaciones].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [data.valorizaciones]
  )

  // KPI cards
  const kpis = useMemo(() => {
    const totalPeriodos = sortedPeriods.length
    const totalPrendas = sortedPeriods.reduce((s, p) => s + totalGuiasPrendas(p), 0)
    const totalS = sortedPeriods.reduce((s, p) => s + totalImporte(p), 0)
    const totalProyectos = data.projects.length
    return { totalPeriodos, totalPrendas, totalS, totalProyectos }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedPeriods, data.projects, data.projectGarmentPrices, data.garmentTypes])

  // Bar chart: importe por periodo
  const importeData = useMemo(() =>
    sortedPeriods.map(p => ({
      name: p.name,
      importe: Math.round(totalImporte(p) * 100) / 100,
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [sortedPeriods, data.projectGarmentPrices, data.garmentTypes])

  // Bar chart: prendas por tipo (from guías, all periods)
  const prendasData = useMemo(() => {
    const countMap: Record<string, number> = {}
    for (const period of sortedPeriods) {
      for (const guia of period.guias) {
        for (const item of guia.items) {
          countMap[item.garmentTypeId] = (countMap[item.garmentTypeId] || 0) + item.quantity
        }
      }
    }
    return data.garmentTypes
      .map(gt => ({ name: gt.name, cantidad: countMap[gt.id] || 0 }))
      .filter(r => r.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad)
  }, [sortedPeriods, data.garmentTypes])

  // Table: resumen por proyecto
  const proyectoReport = useMemo(() =>
    data.projects.map(proj => {
      const periods = sortedPeriods.filter(p => p.projectId === proj.id)
      const prendas = periods.reduce((s, p) => s + totalGuiasPrendas(p), 0)
      const importe = periods.reduce((s, p) => s + totalImporte(p), 0)
      return { name: proj.name, periodos: periods.length, prendas, importe }
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [data.projects, sortedPeriods, data.projectGarmentPrices, data.garmentTypes])

  // Table: actas vs guías por periodo
  const actasGuiasReport = useMemo(() =>
    sortedPeriods.map(p => {
      const actas = totalActasPrendas(p)
      const guias = totalGuiasPrendas(p)
      const diff = guias - actas
      const project = data.projects.find(pr => pr.id === p.projectId)
      return {
        name: p.name,
        project: project?.name ?? "-",
        actas,
        guias,
        diff,
      }
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [sortedPeriods, data.projects])

  const fmtMoney = (v: number) =>
    v.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // ── Planilla metrics ────────────────────────────────────────────────────────

  const planillaKpis = useMemo(() => {
    const allRecords = data.payrollPeriods.flatMap((p) => p.records)
    return {
      empleadosActivos: data.employees.filter((e) => e.estado === "activo").length,
      totalPagado: allRecords.filter((r) => r.pagado).reduce((s, r) => s + r.netoAPagar, 0),
      totalPendiente: allRecords.filter((r) => !r.pagado).reduce((s, r) => s + r.netoAPagar, 0),
      periodosAbiertos: data.payrollPeriods.filter((p) => p.estado === "abierto").length,
    }
  }, [data.payrollPeriods, data.employees])

  const planillaBarData = useMemo(() =>
    [...data.payrollPeriods]
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((p) => ({
        name: p.nombre,
        pagado: Math.round(p.records.filter((r) => r.pagado).reduce((s, r) => s + r.netoAPagar, 0) * 100) / 100,
        pendiente: Math.round(p.records.filter((r) => !r.pagado).reduce((s, r) => s + r.netoAPagar, 0) * 100) / 100,
      })),
  [data.payrollPeriods])

  const planillaEmpReport = useMemo(() =>
    data.employees
      .map((emp) => {
        const recs = data.payrollPeriods.flatMap((p) => p.records).filter((r) => r.employeeId === emp.id)
        if (recs.length === 0) return null
        return {
          nombre: emp.nombre,
          cargo: emp.cargo || "—",
          estado: emp.estado,
          periodos: recs.length,
          totalNeto: recs.reduce((s, r) => s + r.netoAPagar, 0),
          totalPagado: recs.filter((r) => r.pagado).reduce((s, r) => s + r.netoAPagar, 0),
          totalPendiente: recs.filter((r) => !r.pagado).reduce((s, r) => s + r.netoAPagar, 0),
        }
      })
      .filter(Boolean) as { nombre: string; cargo: string; estado: string; periodos: number; totalNeto: number; totalPagado: number; totalPendiente: number }[],
  [data.payrollPeriods, data.employees])

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Estadisticas y resumenes basados en valorizaciones y planilla"
      />
      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <Tabs defaultValue="valorizaciones">
        <TabsList>
          <TabsTrigger value="valorizaciones">Valorizaciones</TabsTrigger>
          <TabsTrigger value="planilla">Planilla</TabsTrigger>
        </TabsList>

        {/* ── VALORIZACIONES TAB ──────────────────────────────────────────── */}
        <TabsContent value="valorizaciones" className="space-y-6 pt-2">

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.totalPeriodos}</p>
                <p className="text-xs text-muted-foreground">Periodos de Valorización</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.totalPrendas.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Prendas (Guías)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">S/ {fmtMoney(kpis.totalS)}</p>
                <p className="text-xs text-muted-foreground">Importe Total (Sin IGV)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="rounded-full bg-purple-100 p-3">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.totalProyectos}</p>
                <p className="text-xs text-muted-foreground">Proyectos Activos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Importe por periodo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Importe por Periodo (S/)</CardTitle>
              <CardDescription>Total valorizado sin IGV por cada periodo</CardDescription>
            </CardHeader>
            <CardContent>
              {importeData.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Sin datos</p>
              ) : (
                <ChartContainer
                  config={{ importe: { label: "Importe S/", color: "#00b0f0" } }}
                  className="h-[280px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={importeData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="importe" fill="#00b0f0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Prendas por tipo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Prendas por Tipo</CardTitle>
              <CardDescription>Cantidad total despachada (Guías, todos los periodos)</CardDescription>
            </CardHeader>
            <CardContent>
              {prendasData.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Sin datos</p>
              ) : (
                <ChartContainer
                  config={{ cantidad: { label: "Cantidad", color: "#4472a8" } }}
                  className="h-[280px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prendasData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="cantidad" fill="#4472a8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumen por proyecto */}
        {proyectoReport.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Resumen por Proyecto</CardTitle>
              <CardDescription>Periodos, prendas e importe agrupados por proyecto</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proyecto</TableHead>
                    <TableHead className="text-right">Periodos</TableHead>
                    <TableHead className="text-right">Total Prendas</TableHead>
                    <TableHead className="text-right">Importe (Sin IGV)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proyectoReport.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium text-card-foreground">{row.name}</TableCell>
                      <TableCell className="text-right text-card-foreground">{row.periodos}</TableCell>
                      <TableCell className="text-right text-card-foreground">{row.prendas.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium text-card-foreground">
                        S/ {fmtMoney(row.importe)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Comparación Actas vs Guías */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-card-foreground">Comparación Actas vs Guías</CardTitle>
            <CardDescription>Prendas recibidas (Actas) vs despachadas (Guías) por periodo</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {actasGuiasReport.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay periodos de valorización registrados.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead className="text-right">Actas</TableHead>
                    <TableHead className="text-right">Guías</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actasGuiasReport.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium text-card-foreground">{row.name}</TableCell>
                      <TableCell className="text-muted-foreground">{row.project}</TableCell>
                      <TableCell className="text-right text-card-foreground">{row.actas.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-card-foreground">{row.guias.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={
                          row.diff === 0
                            ? "text-muted-foreground"
                            : row.diff > 0
                            ? "font-medium text-emerald-600"
                            : "font-medium text-red-600"
                        }>
                          {row.diff > 0 ? "+" : ""}{row.diff.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        </TabsContent>

        {/* ── PLANILLA TAB ────────────────────────────────────────────────── */}
        <TabsContent value="planilla" className="space-y-6 pt-2">

          {/* Planilla KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{planillaKpis.empleadosActivos}</p>
                  <p className="text-xs text-muted-foreground">Empleados Activos</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">S/ {fmtMoney(planillaKpis.totalPagado)}</p>
                  <p className="text-xs text-muted-foreground">Total Pagado</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="rounded-full bg-orange-100 p-3">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">S/ {fmtMoney(planillaKpis.totalPendiente)}</p>
                  <p className="text-xs text-muted-foreground">Pendiente de Pago</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="rounded-full bg-blue-100 p-3">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{planillaKpis.periodosAbiertos}</p>
                  <p className="text-xs text-muted-foreground">Períodos Abiertos</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Neto pagado vs pendiente por período */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Neto por Período</CardTitle>
              <CardDescription>Monto pagado vs pendiente por cada período de planilla</CardDescription>
            </CardHeader>
            <CardContent>
              {planillaBarData.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Sin datos de planilla</p>
              ) : (
                <ChartContainer
                  config={{
                    pagado: { label: "Pagado S/", color: "#16a34a" },
                    pendiente: { label: "Pendiente S/", color: "#ea580c" },
                  }}
                  className="h-[280px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={planillaBarData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="pagado" fill="#16a34a" radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="pendiente" fill="#ea580c" radius={[4, 4, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Resumen por empleado */}
          {planillaEmpReport.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-card-foreground">Resumen por Empleado</CardTitle>
                <CardDescription>Neto acumulado, pagado y pendiente en todos los períodos</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead className="text-right">Períodos</TableHead>
                      <TableHead className="text-right">Total Neto</TableHead>
                      <TableHead className="text-right">Pagado</TableHead>
                      <TableHead className="text-right">Pendiente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planillaEmpReport.map((row) => (
                      <TableRow key={row.nombre}>
                        <TableCell className="font-medium text-card-foreground">{row.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">{row.cargo}</TableCell>
                        <TableCell className="text-right text-card-foreground">{row.periodos}</TableCell>
                        <TableCell className="text-right font-medium text-card-foreground">S/ {fmtMoney(row.totalNeto)}</TableCell>
                        <TableCell className="text-right text-green-700">S/ {fmtMoney(row.totalPagado)}</TableCell>
                        <TableCell className="text-right">
                          {row.totalPendiente > 0
                            ? <Badge variant="outline" className="text-orange-600 border-orange-300">S/ {fmtMoney(row.totalPendiente)}</Badge>
                            : <span className="text-muted-foreground text-xs">Al día</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

        </TabsContent>
      </Tabs>
      </main>
    </>
  )
}
