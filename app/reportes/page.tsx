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
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { OrderStatus } from "@/lib/types"

const STATUS_COLORS: Record<OrderStatus, string> = {
  recibido: "#d97706",
  lavando: "#0284c7",
  listo: "#059669",
  entregado: "#64748b",
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  recibido: "Recibido",
  lavando: "Lavando",
  listo: "Listo",
  entregado: "Entregado",
}

export default function ReportesPage() {
  const { data, getGroup, getWorker } = useStore()

  const statusData = useMemo(() => {
    const counts: Record<OrderStatus, number> = { recibido: 0, lavando: 0, listo: 0, entregado: 0 }
    data.orders.forEach(o => counts[o.status]++)
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status as OrderStatus],
      value: count,
      fill: STATUS_COLORS[status as OrderStatus],
    }))
  }, [data.orders])

  const groupReport = useMemo(() => {
    return data.groups.map(g => {
      const groupOrders = data.orders.filter(o => o.groupId === g.id)
      const totalItems = groupOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)
      const pending = groupOrders.filter(o => o.status !== "entregado").length
      return {
        name: g.name,
        ordenes: groupOrders.length,
        prendas: totalItems,
        pendientes: pending,
      }
    })
  }, [data.groups, data.orders])

  const garmentReport = useMemo(() => {
    const countMap: Record<string, number> = {}
    data.orders.forEach(o => {
      o.items.forEach(item => {
        countMap[item.garmentTypeId] = (countMap[item.garmentTypeId] || 0) + item.quantity
      })
    })
    return data.garmentTypes
      .map(gt => ({
        name: gt.name,
        cantidad: countMap[gt.id] || 0,
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
  }, [data.garmentTypes, data.orders])

  const topWorkers = useMemo(() => {
    const countMap: Record<string, number> = {}
    data.orders.forEach(o => {
      countMap[o.workerId] = (countMap[o.workerId] || 0) + 1
    })
    return Object.entries(countMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([workerId, count]) => {
        const worker = getWorker(workerId)
        const group = worker ? getGroup(worker.groupId) : undefined
        return {
          name: worker?.name ?? "Desconocido",
          group: group?.name ?? "-",
          ordenes: count,
        }
      })
  }, [data.orders, getWorker, getGroup])

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Estadisticas y resumenes de la planta"
      />
      <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status pie chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Ordenes por Estado</CardTitle>
              <CardDescription>Distribucion actual de ordenes</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  recibido: { label: "Recibido", color: STATUS_COLORS.recibido },
                  lavando: { label: "Lavando", color: STATUS_COLORS.lavando },
                  listo: { label: "Listo", color: STATUS_COLORS.listo },
                  entregado: { label: "Entregado", color: STATUS_COLORS.entregado },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Garment bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Prendas mas Lavadas</CardTitle>
              <CardDescription>Cantidad total por tipo de prenda</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  cantidad: { label: "Cantidad", color: "#4472a8" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={garmentReport} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="cantidad" fill="#4472a8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Group report table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-card-foreground">Resumen por Cuadrilla</CardTitle>
            <CardDescription>Ordenes y prendas por cada cuadrilla</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuadrilla</TableHead>
                  <TableHead>Total Ordenes</TableHead>
                  <TableHead>Total Prendas</TableHead>
                  <TableHead>Pendientes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupReport.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium text-card-foreground">{row.name}</TableCell>
                    <TableCell className="text-card-foreground">{row.ordenes}</TableCell>
                    <TableCell className="text-card-foreground">{row.prendas}</TableCell>
                    <TableCell>
                      <span className={row.pendientes > 0 ? "font-medium text-amber-600" : "text-muted-foreground"}>
                        {row.pendientes}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top workers table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-card-foreground">Mineros con mas Ordenes</CardTitle>
            <CardDescription>Top 10 mineros por cantidad de ordenes</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Minero</TableHead>
                  <TableHead>Cuadrilla</TableHead>
                  <TableHead>Ordenes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topWorkers.map((row, i) => (
                  <TableRow key={row.name}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium text-card-foreground">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.group}</TableCell>
                    <TableCell className="font-medium text-card-foreground">{row.ordenes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
