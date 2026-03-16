import * as XLSX from "xlsx"
import type { ValorizacionPeriod, GarmentType } from "./types"

interface ExcelOptions {
  period: ValorizacionPeriod
  garmentTypes: GarmentType[]
  garmentTypeIds: string[]
}

function formatShortDate(dateStr: string) {
  const date = new Date(dateStr + "T12:00:00")
  const day = date.getDate()
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  return `${day}-${months[date.getMonth()]}`
}

function getQty(
  entry: { items: { garmentTypeId: string; quantity: number }[] },
  gtId: string
) {
  return entry.items.find((i) => i.garmentTypeId === gtId)?.quantity ?? 0
}

function getRowTotal(
  entries: { items: { garmentTypeId: string; quantity: number }[] }[],
  gtId: string
) {
  return entries.reduce((sum, e) => sum + getQty(e, gtId), 0)
}

export function generateValorizacionExcel(options: ExcelOptions) {
  const { period, garmentTypes, garmentTypeIds } = options

  const wb = XLSX.utils.book_new()

  const sortedActas = [...period.actas].sort((a, b) => a.date.localeCompare(b.date))
  const sortedGuias = [...period.guias].sort((a, b) => a.date.localeCompare(b.date))

  const getTypeName = (id: string) =>
    garmentTypes.find((gt) => gt.id === id)?.name?.toUpperCase() ?? "DESCONOCIDO"
  const getTypePrice = (id: string) =>
    garmentTypes.find((gt) => gt.id === id)?.pricePerUnit ?? 0

  // ===== SHEET 1: Actas =====
  {
    const rows: (string | number)[][] = []

    // Title
    rows.push([`ROPA ENVIADA DE MINA A LAVANDERIA - ${period.name.toUpperCase()}`])
    rows.push([])

    // Header
    const header = [
      "PRENDA",
      ...sortedActas.map((a) => `${formatShortDate(a.date)} (${a.number || "-"})`),
      "TOTAL",
    ]
    rows.push(header)

    // Body
    for (const gtId of garmentTypeIds) {
      const row: (string | number)[] = [getTypeName(gtId)]
      let rowTotal = 0
      for (const acta of sortedActas) {
        const q = getQty(acta, gtId)
        row.push(q)
        rowTotal += q
      }
      row.push(rowTotal)
      rows.push(row)
    }

    // Grand total row
    const totalRow: (string | number)[] = ["TOTAL GENERAL"]
    let grandTotal = 0
    for (const acta of sortedActas) {
      const colTotal = garmentTypeIds.reduce((s, id) => s + getQty(acta, id), 0)
      totalRow.push(colTotal)
      grandTotal += colTotal
    }
    totalRow.push(grandTotal)
    rows.push(totalRow)

    const ws = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, "Actas")
  }

  // ===== SHEET 2: Guias =====
  {
    const rows: (string | number)[][] = []

    rows.push([`ROPA ENVIADA DE LAVANDERIA A MINA - ${period.name.toUpperCase()}`])
    rows.push([])

    const header = [
      "PRENDA",
      ...sortedGuias.map((g) => `${formatShortDate(g.date)} (${g.number || "-"})`),
      "TOTAL",
    ]
    rows.push(header)

    for (const gtId of garmentTypeIds) {
      const row: (string | number)[] = [getTypeName(gtId)]
      let rowTotal = 0
      for (const guia of sortedGuias) {
        const q = getQty(guia, gtId)
        row.push(q)
        rowTotal += q
      }
      row.push(rowTotal)
      rows.push(row)
    }

    const totalRow: (string | number)[] = ["TOTAL GENERAL"]
    let grandTotal = 0
    for (const guia of sortedGuias) {
      const colTotal = garmentTypeIds.reduce((s, id) => s + getQty(guia, id), 0)
      totalRow.push(colTotal)
      grandTotal += colTotal
    }
    totalRow.push(grandTotal)
    rows.push(totalRow)

    const ws = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, "Guias")
  }

  // ===== SHEET 3: Valorización (Sin IGV y Con IGV) =====
  {
    const rows: (string | number | null)[][] = []

    rows.push([`VALORIZACION DEL SERVICIO - ${period.name.toUpperCase()}`])
    rows.push([])

    // Two tables side by side: SIN IGV (cols A-D), gap (col E), CON IGV (cols F-I)
    rows.push(["VALORIZACIÓN SIN IGV", null, null, null, null, "VALORIZACIÓN CON IGV"])
    rows.push([
      "DETALLE", "CANTIDAD", "P.U.", "IMPORTE",
      null,
      "DETALLE", "CANTIDAD", "P.U.", "IMPORTE",
    ])

    let subtotal = 0
    const itemRows: { name: string; qty: number; pu: number; importe: number }[] = []

    for (const gtId of garmentTypeIds) {
      const qty = getRowTotal(sortedActas, gtId)
      const pu = getTypePrice(gtId)
      const importe = qty * pu
      subtotal += importe
      itemRows.push({ name: getTypeName(gtId), qty, pu, importe })
    }

    const igv = subtotal * 0.18
    const totalConIgv = subtotal + igv

    for (const item of itemRows) {
      rows.push([
        item.name, item.qty, item.pu, item.importe,
        null,
        item.name, item.qty, item.pu, item.importe,
      ])
    }

    rows.push([])
    // Summary rows
    rows.push([
      "SUB TOTAL", null, null, subtotal,
      null,
      "SUB TOTAL", null, null, subtotal,
    ])
    rows.push([
      "TOTAL (Sin IGV)", null, null, subtotal,
      null,
      "I.G.V. (18%)", null, null, igv,
    ])
    rows.push([
      null, null, null, null,
      null,
      "TOTAL (Con IGV)", null, null, totalConIgv,
    ])

    const ws = XLSX.utils.aoa_to_sheet(rows)

    // Set column widths
    ws["!cols"] = [
      { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 14 },
      { wch: 4 },
      { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 14 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, "Valorización")
  }

  XLSX.writeFile(wb, `Valorizacion-${period.name.replace(/\s+/g, "-")}.xlsx`)
}
