"use client"

import { useStore } from "@/lib/store"
import { StatusBadge } from "@/components/status-badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface OrderDetailProps {
  orderId: string
  onClose: () => void
}

export function OrderDetail({ orderId, onClose }: OrderDetailProps) {
  const { getOrder, getWorker, getGroup, getGarmentType, getTotalItems } = useStore()
  const order = getOrder(orderId)

  if (!order) return null

  const worker = getWorker(order.workerId)
  const group = getGroup(order.groupId)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-card-foreground">Detalle de Orden</DialogTitle>
          <DialogDescription>
            Orden registrada el {format(new Date(order.createdAt), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Minero</p>
              <p className="text-sm font-medium text-card-foreground">{worker?.name ?? "Desconocido"}</p>
              <p className="text-xs text-muted-foreground">DNI: {worker?.dni ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cuadrilla</p>
              <p className="text-sm font-medium text-card-foreground">{group?.name ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              <div className="mt-1">
                <StatusBadge status={order.status} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Prendas</p>
              <p className="text-sm font-medium text-card-foreground">{getTotalItems(order)}</p>
            </div>
          </div>

          {order.notes && (
            <div>
              <p className="text-xs text-muted-foreground">Notas</p>
              <p className="text-sm text-card-foreground">{order.notes}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-2">Items</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prenda</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => {
                  const gt = getGarmentType(item.garmentTypeId)
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-card-foreground">{gt?.name ?? "Desconocido"}</TableCell>
                      <TableCell className="text-card-foreground">{item.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">{item.observations || "-"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {order.deliveredAt && (
            <div>
              <p className="text-xs text-muted-foreground">Fecha de entrega</p>
              <p className="text-sm text-card-foreground">
                {format(new Date(order.deliveredAt), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
