"use client"

import Link from "next/link"
import { useStore } from "@/lib/store"
import { PageHeader } from "@/components/page-header"
import { DashboardStats } from "@/components/dashboard-stats"
import { RecentOrders } from "@/components/recent-orders"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function DashboardPage() {
  const { data } = useStore()

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Resumen general de la planta de lavado"
        actions={
          <Button asChild>
            <Link href="/ordenes/nueva">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Orden
            </Link>
          </Button>
        }
      />
      <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        <DashboardStats orders={data.orders} workers={data.workers} groups={data.groups} />
        <RecentOrders />
      </main>
    </>
  )
}
