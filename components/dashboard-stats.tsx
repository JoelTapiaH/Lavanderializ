"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, WashingMachine, CheckCircle2, Truck, Users, UsersRound } from "lucide-react"
import type { Order, Worker, Group } from "@/lib/types"

interface DashboardStatsProps {
  orders: Order[]
  workers: Worker[]
  groups: Group[]
}

export function DashboardStats({ orders, workers, groups }: DashboardStatsProps) {
  const recibidos = orders.filter(o => o.status === "recibido").length
  const lavando = orders.filter(o => o.status === "lavando").length
  const listos = orders.filter(o => o.status === "listo").length
  const entregados = orders.filter(o => o.status === "entregado").length
  const totalPrendas = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)

  const stats = [
    {
      title: "Recibidos",
      value: recibidos,
      description: "Ordenes por procesar",
      icon: Package,
      accent: "text-amber-600 bg-amber-50",
    },
    {
      title: "En Lavado",
      value: lavando,
      description: "Ordenes en proceso",
      icon: WashingMachine,
      accent: "text-sky-600 bg-sky-50",
    },
    {
      title: "Listos",
      value: listos,
      description: "Listos para entregar",
      icon: CheckCircle2,
      accent: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Entregados",
      value: entregados,
      description: "Ordenes completadas",
      icon: Truck,
      accent: "text-slate-500 bg-slate-50",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.accent}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-card-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{totalPrendas}</p>
              <p className="text-xs text-muted-foreground">Prendas totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{workers.length}</p>
              <p className="text-xs text-muted-foreground">Mineros registrados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UsersRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{groups.length}</p>
              <p className="text-xs text-muted-foreground">Cuadrillas activas</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
