"use client"

import Link from "next/link"
import { useStore } from "@/lib/store"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export function RecentOrders() {
  const { data, getWorker, getGroup, getTotalItems } = useStore()
  const recentOrders = data.orders.slice(0, 8)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-card-foreground">Ordenes Recientes</CardTitle>
          <CardDescription>Ultimas ordenes registradas en la planta</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/ordenes">
            Ver todas
            <ArrowRight className="ml-2 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {recentOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay ordenes registradas aun.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Minero</TableHead>
                <TableHead className="hidden sm:table-cell">Cuadrilla</TableHead>
                <TableHead>Prendas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((order) => {
                const worker = getWorker(order.workerId)
                const group = getGroup(order.groupId)
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium text-card-foreground">
                      {worker?.name ?? "Desconocido"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {group?.name ?? "-"}
                    </TableCell>
                    <TableCell className="text-card-foreground">{getTotalItems(order)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {format(new Date(order.createdAt), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
