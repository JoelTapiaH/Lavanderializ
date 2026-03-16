"use client"

import { useState, useMemo } from "react"
import { useStore } from "@/lib/store"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Pencil, FileDown, Loader2, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"
import { ValorizacionTable } from "@/components/valorizacion-table"
import { ValorizacionPeriodDialog } from "@/components/valorizacion-period-dialog"
import { generateValorizacionPdf } from "@/lib/generate-pdf"
import { generateValorizacionExcel } from "@/lib/generate-excel"

export default function ValorizacionPage() {
  const {
    data,
    deleteValorizacion,
    addActa,
    updateActa,
    deleteActa,
    addGuia,
    updateGuia,
    deleteGuia,
  } = useStore()

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    data.valorizaciones[0]?.id ?? ""
  )
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false)
  const [editPeriodId, setEditPeriodId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const selectedPeriod = data.valorizaciones.find(
    (v) => v.id === selectedPeriodId
  )

  // Collect all unique garment type IDs used across actas and guias
  const allGarmentTypeIds = useMemo(() => {
    if (!selectedPeriod) return []
    const ids = new Set<string>()
    for (const acta of selectedPeriod.actas) {
      for (const item of acta.items) {
        ids.add(item.garmentTypeId)
      }
    }
    for (const guia of selectedPeriod.guias) {
      for (const item of guia.items) {
        ids.add(item.garmentTypeId)
      }
    }
    return Array.from(ids)
  }, [selectedPeriod])

  async function handleExportPdf() {
    if (!selectedPeriod) return
    setIsExporting(true)
    try {
      await generateValorizacionPdf({
        period: selectedPeriod,
        garmentTypes: data.garmentTypes,
        garmentTypeIds: allGarmentTypeIds,
      })
      toast.success("PDF generado exitosamente")
    } catch (err) {
      console.error(err)
      toast.error("Error al generar el PDF")
    } finally {
      setIsExporting(false)
    }
  }

  function handleExportExcel() {
    if (!selectedPeriod) return
    try {
      generateValorizacionExcel({
        period: selectedPeriod,
        garmentTypes: data.garmentTypes,
        garmentTypeIds: allGarmentTypeIds,
      })
      toast.success("Excel generado exitosamente")
    } catch (err) {
      console.error(err)
      toast.error("Error al generar el Excel")
    }
  }

  function handleDeletePeriod() {
    if (!selectedPeriodId) return
    deleteValorizacion(selectedPeriodId)
    setSelectedPeriodId(
      data.valorizaciones.find((v) => v.id !== selectedPeriodId)?.id ?? ""
    )
    toast.success("Periodo eliminado")
  }

  function handleEditPeriod() {
    setEditPeriodId(selectedPeriodId)
    setPeriodDialogOpen(true)
  }

  function formatDateRange() {
    if (!selectedPeriod) return ""
    const fmt = (d: string) => {
      const date = new Date(d + "T12:00:00")
      return date.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    }
    return `DEL ${fmt(selectedPeriod.startDate)} AL ${fmt(selectedPeriod.endDate)}`
  }

  return (
    <>
      <PageHeader
        title="Valorizacion del Servicio"
        description="Registro de prendas enviadas y recibidas por periodo. Haz clic en cualquier celda para editar."
        actions={
          <Button
            onClick={() => {
              setEditPeriodId(null)
              setPeriodDialogOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Periodo
          </Button>
        }
      />
      <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        {/* Period selector */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <Label className="text-sm font-medium text-foreground whitespace-nowrap">
                Periodo:
              </Label>
              {data.valorizaciones.length > 0 ? (
                <Select
                  value={selectedPeriodId}
                  onValueChange={setSelectedPeriodId}
                >
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Selecciona un periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.valorizaciones.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay periodos creados.
                </p>
              )}
            </div>
            {selectedPeriod && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleExportPdf}
                  disabled={isExporting || allGarmentTypeIds.length === 0}
                >
                  {isExporting ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileDown className="mr-1 h-3.5 w-3.5" />
                  )}
                  Exportar PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportExcel}
                  disabled={allGarmentTypeIds.length === 0}
                >
                  <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
                  Exportar Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditPeriod}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDeletePeriod}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Eliminar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedPeriod && (
          <>
            {/* Title bar */}
            <div className="rounded-lg px-4 py-3 text-center" style={{ background: "#00b0f0", border: "2px solid #0090c8" }}>
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#000000" }}>
                Valorizacion del Servicio de Lavanderia
              </h2>
              <p className="text-xs font-semibold" style={{ color: "#000000" }}>
                {"LAVANDERIA LIZ - PERIODO DEL SERVICIO "}
                {formatDateRange()}
              </p>
            </div>

            {/* Table 1: Actas */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground uppercase">
                Ropa enviada de Mina a Lavanderia - Periodo{" "}
                {selectedPeriod.name}
              </h3>
              <ValorizacionTable
                type="acta"
                entries={selectedPeriod.actas}
                garmentTypeIds={allGarmentTypeIds}
                garmentTypes={data.garmentTypes}
                valorizacionId={selectedPeriodId}
                onUpdateEntry={(entryId, number, date, items) => {
                  updateActa(selectedPeriodId, entryId, number, date, items)
                }}
                onDeleteEntry={(id) => {
                  deleteActa(selectedPeriodId, id)
                  toast.success("Acta eliminada")
                }}
                onAddEntry={(number, date, items) => {
                  addActa(selectedPeriodId, number, date, items)
                  toast.success("Acta registrada")
                }}
              />
            </div>

            {/* Table 2: Guias */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground uppercase">
                Ropa enviada de Lavanderia a Mina - Periodo{" "}
                {selectedPeriod.name}
              </h3>
              <ValorizacionTable
                type="guia"
                entries={selectedPeriod.guias}
                garmentTypeIds={allGarmentTypeIds}
                garmentTypes={data.garmentTypes}
                valorizacionId={selectedPeriodId}
                onUpdateEntry={(entryId, number, date, items) => {
                  updateGuia(selectedPeriodId, entryId, number, date, items)
                }}
                onDeleteEntry={(id) => {
                  deleteGuia(selectedPeriodId, id)
                  toast.success("Guia eliminada")
                }}
                onAddEntry={(number, date, items) => {
                  addGuia(selectedPeriodId, number, date, items)
                  toast.success("Guia registrada")
                }}
              />
            </div>

            {/* Pricing summaries */}
            {allGarmentTypeIds.length > 0 && (() => {
              let subtotal = 0
              const itemRows = allGarmentTypeIds.map((gtId, idx) => {
                const gt = data.garmentTypes.find((g) => g.id === gtId)
                const qty = selectedPeriod.actas.reduce(
                  (sum, a) => sum + (a.items.find((i) => i.garmentTypeId === gtId)?.quantity ?? 0),
                  0
                )
                const pu = gt?.pricePerUnit ?? 0
                const importe = qty * pu
                subtotal += importe
                return { gtId, gt, qty, pu, importe, idx }
              })
              const igv = subtotal * 0.18
              const totalConIgv = subtotal + igv

              const tableHead = (
                <thead>
                  <tr style={{ background: "#00b0f0" }}>
                    {["Detalle", "Cantidad", "P.U", "Importe"].map((h) => (
                      <th key={h} className={`border px-4 py-2 text-xs font-bold uppercase ${h === "Detalle" ? "text-left" : "text-right"}`} style={{ color: "#000000", borderColor: "#0090c8" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
              )

              const tableBody = (
                <tbody>
                  {itemRows.map(({ gtId, gt, qty, pu, importe, idx }) => (
                    <tr key={gtId} style={{ background: idx % 2 === 0 ? "#ffffff" : "#d9f2fb" }}>
                      <td className="border px-4 py-1.5 text-xs font-bold uppercase" style={{ borderColor: "#8cd7f0", color: "#1a3a6e" }}>
                        {gt?.name ?? "Desconocido"}
                      </td>
                      <td className="border px-4 py-1.5 text-right text-xs tabular-nums" style={{ borderColor: "#8cd7f0", color: "#1a3a6e" }}>
                        {qty.toLocaleString()}
                      </td>
                      <td className="border px-4 py-1.5 text-right text-xs tabular-nums" style={{ borderColor: "#8cd7f0", color: "#1a3a6e" }}>
                        {pu.toFixed(2)}
                      </td>
                      <td className="border px-4 py-1.5 text-right text-xs font-semibold tabular-nums" style={{ borderColor: "#8cd7f0", color: "#00b0f0" }}>
                        {importe.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              )

              return (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-foreground uppercase">
                    {"Valorizacion - "}
                    {selectedPeriod.name}
                  </h3>
                  <div className="flex flex-wrap gap-6">
                    {/* Sin IGV */}
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sin IGV</p>
                      <div className="overflow-x-auto rounded-lg" style={{ border: "2px solid #00b0f0" }}>
                        <table className="border-collapse text-sm">
                          {tableHead}
                          {tableBody}
                          <tfoot>
                            <tr style={{ background: "#00b0f0" }}>
                              <td colSpan={3} className="border px-4 py-2 text-right text-xs font-bold uppercase" style={{ borderColor: "#0090c8", color: "#000000" }}>
                                Total
                              </td>
                              <td className="border px-4 py-2 text-right text-xs font-bold tabular-nums" style={{ borderColor: "#0090c8", color: "#000000" }}>
                                S/ {subtotal.toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Con IGV */}
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Con IGV (18%)</p>
                      <div className="overflow-x-auto rounded-lg" style={{ border: "2px solid #00b0f0" }}>
                        <table className="border-collapse text-sm">
                          {tableHead}
                          {tableBody}
                          <tfoot>
                            <tr style={{ background: "#d9f2fb" }}>
                              <td colSpan={3} className="border px-4 py-2 text-right text-xs font-bold uppercase" style={{ borderColor: "#8cd7f0", color: "#1a3a6e" }}>
                                Sub Total
                              </td>
                              <td className="border px-4 py-2 text-right text-xs font-bold tabular-nums" style={{ borderColor: "#8cd7f0", color: "#1a3a6e" }}>
                                S/ {subtotal.toFixed(2)}
                              </td>
                            </tr>
                            <tr style={{ background: "#d9f2fb" }}>
                              <td colSpan={3} className="border px-4 py-1.5 text-right text-xs font-semibold" style={{ borderColor: "#8cd7f0", color: "#1a3a6e" }}>
                                I.G.V. (18%)
                              </td>
                              <td className="border px-4 py-1.5 text-right text-xs font-semibold tabular-nums" style={{ borderColor: "#8cd7f0", color: "#1a3a6e" }}>
                                S/ {igv.toFixed(2)}
                              </td>
                            </tr>
                            <tr style={{ background: "#00b0f0" }}>
                              <td colSpan={3} className="border px-4 py-2 text-right text-xs font-bold uppercase" style={{ borderColor: "#0090c8", color: "#000000" }}>
                                Total
                              </td>
                              <td className="border px-4 py-2 text-right text-xs font-bold tabular-nums" style={{ borderColor: "#0090c8", color: "#000000" }}>
                                S/ {totalConIgv.toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </main>

      {/* Period dialog */}
      <ValorizacionPeriodDialog
        open={periodDialogOpen}
        onOpenChange={setPeriodDialogOpen}
        editId={editPeriodId}
      />
    </>
  )
}
