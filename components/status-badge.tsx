import { Badge } from "@/components/ui/badge"
import type { OrderStatus } from "@/lib/types"

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  recibido: {
    label: "Recibido",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  lavando: {
    label: "Lavando",
    className: "bg-sky-100 text-sky-800 border-sky-200",
  },
  listo: {
    label: "Listo",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  entregado: {
    label: "Entregado",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
}

interface StatusBadgeProps {
  status: OrderStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}
