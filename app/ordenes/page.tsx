"use client"

import { useState } from "react"
import Link from "next/link"
import { useStore } from "@/lib/store"
import { PageHeader } from "@/components/page-header"
import { OrderTable } from "@/components/order-table"
import { OrderDetail } from "@/components/order-detail"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search } from "lucide-react"
import type { OrderStatus } from "@/lib/types"

export default function OrdenesPage() {
  const { data } = useStore()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "todos">("todos")
  const [groupFilter, setGroupFilter] = useState<string>("todos")
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const filteredOrders = data.orders.filter((order) => {
    const worker = data.workers.find(w => w.id === order.workerId)
    const matchSearch = search === "" ||
      worker?.name.toLowerCase().includes(search.toLowerCase()) ||
      worker?.dni.includes(search)
    const matchStatus = statusFilter === "todos" || order.status === statusFilter
    const matchGroup = groupFilter === "todos" || order.groupId === groupFilter
    return matchSearch && matchStatus && matchGroup
  })

  return (
    <>
      <PageHeader
        title="Ordenes de Lavado"
        description={`${data.orders.length} ordenes registradas`}
        actions={
          <Button asChild>
            <Link href="/ordenes/nueva">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Orden
            </Link>
          </Button>
        }
      />
      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o DNI..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "todos")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="recibido">Recibido</SelectItem>
                <SelectItem value="lavando">Lavando</SelectItem>
                <SelectItem value="listo">Listo</SelectItem>
                <SelectItem value="entregado">Entregado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Cuadrilla" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {data.groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <OrderTable orders={filteredOrders} onSelectOrder={setSelectedOrderId} />

        {selectedOrderId && (
          <OrderDetail
            orderId={selectedOrderId}
            onClose={() => setSelectedOrderId(null)}
          />
        )}
      </main>
    </>
  )
}
