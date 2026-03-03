"use client"

import { useStore } from "@/lib/store"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Eye, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import type { Order, OrderStatus } from "@/lib/types"

interface OrderTableProps {
  orders: Order[]
  onSelectOrder: (orderId: string) => void
}

export function OrderTable({ orders, onSelectOrder }: OrderTableProps) {
  const { getWorker, getGroup, getTotalItems, updateOrderStatus, deleteOrder } = useStore()

  const handleStatusChange = (orderId: string, status: string) => {
    updateOrderStatus(orderId, status as OrderStatus)
    toast.success(`Estado actualizado a "${status}"`)
  }

  const handleDelete = (orderId: string) => {
    deleteOrder(orderId)
    toast.success("Orden eliminada")
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No se encontraron ordenes con los filtros seleccionados.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Minero</TableHead>
              <TableHead className="hidden sm:table-cell">Cuadrilla</TableHead>
              <TableHead>Prendas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden md:table-cell">Fecha</TableHead>
              <TableHead className="hidden lg:table-cell">Notas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const worker = getWorker(order.workerId)
              const group = getGroup(order.groupId)
              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-card-foreground">{worker?.name ?? "Desconocido"}</p>
                      <p className="text-xs text-muted-foreground">{worker?.dni ?? ""}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {group?.name ?? "-"}
                  </TableCell>
                  <TableCell className="font-medium text-card-foreground">{getTotalItems(order)}</TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(v) => handleStatusChange(order.id, v)}
                    >
                      <SelectTrigger className="w-[130px] h-8 border-0 bg-transparent p-0">
                        <StatusBadge status={order.status} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recibido">Recibido</SelectItem>
                        <SelectItem value="lavando">Lavando</SelectItem>
                        <SelectItem value="listo">Listo</SelectItem>
                        <SelectItem value="entregado">Entregado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {format(new Date(order.createdAt), "dd MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="hidden max-w-[200px] truncate text-muted-foreground lg:table-cell">
                    {order.notes || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onSelectOrder(order.id)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver detalle</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(order.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
