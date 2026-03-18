import ExcelJS from "exceljs"
import type { ValorizacionPeriod, GarmentType } from "./types"

interface ExcelOptions {
  period: ValorizacionPeriod
  garmentTypes: GarmentType[]
  garmentTypeIds: string[]
  companyName?: string
  ruc?: string
}

// ─── Colors (ARGB) matching the PDF ─────────────────────────────────────────
const C_PRIMARY   = "FF00B0F0"  // #00b0f0 celeste
const C_PRIMARY_D = "FF0090C8"  // #0090c8 celeste oscuro
const C_GREEN     = "FFB2D8B5"  // #b2d8b5 verde cabecera
const C_ROW_ALT   = "FFD9F2FB"  // #d9f2fb celeste claro (fila par)
const C_TEXT_DARK = "FF1A3A6E"  // #1a3a6e azul oscuro
const C_BLACK     = "FF000000"
const C_WHITE     = "FFFFFFFF"
const C_RED       = "FFEF4444"  // para el punto ●

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00")
  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
  return `${d.getDate()}-${months[d.getMonth()]}`
}
function formatDateRange(startDate: string, endDate: string) {
  const fmt = (d: string) => {
    const dt = new Date(d + "T12:00:00")
    return `${String(dt.getDate()).padStart(2,"0")}-${String(dt.getMonth()+1).padStart(2,"0")}`
  }
  const endYear = String(new Date(endDate + "T12:00:00").getFullYear()).slice(-2)
  return `DEL ${fmt(startDate)} AL ${fmt(endDate)}-${endYear}`
}
function getQty(entry: { items: { garmentTypeId: string; quantity: number }[] }, gtId: string) {
  return entry.items.find(i => i.garmentTypeId === gtId)?.quantity ?? 0
}
function getRowTotal(entries: { items: { garmentTypeId: string; quantity: number }[] }[], gtId: string) {
  return entries.reduce((s, e) => s + getQty(e, gtId), 0)
}

// ─── Style helpers ────────────────────────────────────────────────────────────
type FillArg = { argb: string }
type BorderSide = { style: "thin"; color: { argb: string } }
const thinBorder = (argb: string): BorderSide => ({ style: "thin", color: { argb } })

function applyFill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } as FillArg }
}
function applyBorder(cell: ExcelJS.Cell, argb = "FFB0B0B0") {
  const b = thinBorder(argb)
  cell.border = { top: b, left: b, bottom: b, right: b }
}
function styleHeader(cell: ExcelJS.Cell, bgArgb: string, textArgb = C_BLACK, bold = true, italic = false, sz = 8, align: ExcelJS.Alignment["horizontal"] = "center") {
  applyFill(cell, bgArgb)
  applyBorder(cell, bgArgb === C_PRIMARY ? "FF0090C8" : "FF8ABA8E")
  cell.font = { bold, italic, size: sz, color: { argb: textArgb } }
  cell.alignment = { horizontal: align, vertical: "middle", wrapText: true }
}
function styleData(cell: ExcelJS.Cell, bgArgb: string, textArgb: string, bold = false, align: ExcelJS.Alignment["horizontal"] = "center", sz = 8) {
  applyFill(cell, bgArgb)
  applyBorder(cell, "FF8CD7F0")
  cell.font = { bold, size: sz, color: { argb: textArgb } }
  cell.alignment = { horizontal: align, vertical: "middle" }
}

export async function generateValorizacionExcel(options: ExcelOptions) {
  const {
    period, garmentTypes, garmentTypeIds,
    companyName = "JJ SERVICIOS LIZ E.I.R.L.",
    ruc = "20534123605",
  } = options

  const sortedActas = [...period.actas].sort((a, b) => a.date.localeCompare(b.date))
  const sortedGuias = [...period.guias].sort((a, b) => a.date.localeCompare(b.date))

  const getTypeName = (id: string) => garmentTypes.find(g => g.id === id)?.name?.toUpperCase() ?? "DESCONOCIDO"
  const getTypePrice = (id: string) => garmentTypes.find(g => g.id === id)?.pricePerUnit ?? 0

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Valorizacion")

  // Max columns needed for the entry tables
  const maxEntryCols = Math.max(sortedActas.length, sortedGuias.length)
  const totalEntryCols = 1 + maxEntryCols + 1  // name + dates + total

  // Set column widths
  ws.getColumn(1).width = 30  // name
  for (let c = 2; c <= maxEntryCols + 1; c++) ws.getColumn(c).width = 12  // dates
  ws.getColumn(maxEntryCols + 2).width = 14  // total

  let row = 1

  // ── Company header ────────────────────────────────────────────────────────
  {
    const r = ws.getRow(row++)
    ws.mergeCells(row - 1, 1, row - 1, totalEntryCols)
    const c = r.getCell(1)
    c.value = companyName
    c.font = { bold: true, size: 11 }
    c.alignment = { horizontal: "center" }
  }
  {
    const r = ws.getRow(row++)
    ws.mergeCells(row - 1, 1, row - 1, totalEntryCols)
    const c = r.getCell(1)
    c.value = "LAVANDERIA"
    c.alignment = { horizontal: "center" }
  }
  {
    const r = ws.getRow(row++)
    ws.mergeCells(row - 1, 1, row - 1, totalEntryCols)
    const c = r.getCell(1)
    c.value = `RUC. ${ruc}`
    c.alignment = { horizontal: "center" }
  }
  row++ // empty

  // ── Title bars ────────────────────────────────────────────────────────────
  {
    ws.mergeCells(row, 1, row, totalEntryCols)
    const c = ws.getRow(row).getCell(1)
    c.value = "VALORIZACION DEL SERVICIO DE LAVANDERIA"
    styleHeader(c, C_PRIMARY, C_BLACK, true, false, 10)
    ws.getRow(row).height = 18
    row++
  }
  {
    ws.mergeCells(row, 1, row, totalEntryCols)
    const c = ws.getRow(row).getCell(1)
    c.value = `PERIODO DEL SERVICIO  ${formatDateRange(period.startDate, period.endDate)}`
    styleHeader(c, C_PRIMARY_D, C_BLACK, true, false, 9)
    ws.getRow(row).height = 16
    row++
  }
  row++ // empty

  // ── Entry table helper ────────────────────────────────────────────────────
  function writeEntryTable(
    entries: typeof sortedActas,
    tableTitle: string,
    labelRow: string,
    totalLabel: string,
    compareEntries?: typeof sortedActas,
  ) {
    const cols = entries.length

    // Title row (merged, green)
    ws.mergeCells(row, 1, row, 1 + cols + 1)
    const titleCell = ws.getRow(row).getCell(1)
    titleCell.value = tableTitle
    styleHeader(titleCell, C_GREEN, C_BLACK, true, false, 8)
    ws.getRow(row).height = 15
    row++

    // Header row 1: FECHA + dates + Total label
    {
      const r = ws.getRow(row)
      r.height = 14
      styleHeader(r.getCell(1), C_GREEN, C_BLACK, true, false, 8, "left")
      r.getCell(1).value = "FECHA"
      for (let i = 0; i < cols; i++) {
        const c = r.getCell(2 + i)
        c.value = formatShortDate(entries[i].date)
        styleHeader(c, C_GREEN, C_BLACK, true, false, 8)
      }
      // merge the total cell across 2 header rows
      ws.mergeCells(row, 2 + cols, row + 1, 2 + cols)
      const tc = r.getCell(2 + cols)
      tc.value = totalLabel
      styleHeader(tc, C_GREEN, C_BLACK, true, false, 8)
      row++
    }

    // Header row 2: label + numbers
    {
      const r = ws.getRow(row)
      r.height = 14
      styleHeader(r.getCell(1), C_GREEN, C_BLACK, true, false, 8, "left")
      r.getCell(1).value = labelRow
      for (let i = 0; i < cols; i++) {
        const c = r.getCell(2 + i)
        c.value = entries[i].number || "-"
        styleHeader(c, C_GREEN, C_BLACK, true, false, 8)
      }
      row++
    }

    // Body rows
    garmentTypeIds.forEach((gtId, idx) => {
      const r = ws.getRow(row)
      r.height = 13
      const bg = idx % 2 === 0 ? C_WHITE : C_ROW_ALT
      const rowTotal = getRowTotal(entries, gtId)
      const hasDiff = compareEntries ? getRowTotal(compareEntries, gtId) !== rowTotal : false

      styleData(r.getCell(1), bg, C_TEXT_DARK, true, "left")
      r.getCell(1).value = getTypeName(gtId)

      for (let i = 0; i < cols; i++) {
        const q = getQty(entries[i], gtId)
        const c = r.getCell(2 + i)
        styleData(c, bg, C_TEXT_DARK, false, "center")
        c.value = q > 0 ? q : ""
      }

      const tc = r.getCell(2 + cols)
      styleData(tc, bg, C_PRIMARY.replace("FF","FF"), true, "right")
      tc.font = { bold: true, size: 8, color: { argb: C_PRIMARY } }
      applyFill(tc, bg)
      applyBorder(tc, "FF8CD7F0")
      tc.alignment = { horizontal: "right", vertical: "middle" }
      if (hasDiff) {
        tc.value = { richText: [
          { text: rowTotal > 0 ? rowTotal.toLocaleString() : "", font: { bold: true, size: 8, color: { argb: C_PRIMARY } } },
          { text: " ●", font: { bold: true, size: 8, color: { argb: C_RED } } },
        ]}
      } else {
        tc.value = rowTotal > 0 ? rowTotal : ""
      }

      row++
    })

    row++ // gap after table
  }

  // ── Actas ─────────────────────────────────────────────────────────────────
  writeEntryTable(
    sortedActas,
    `ROPA ENVIADA DE MINA A LAVANDERIA - ${period.name.toUpperCase()}`,
    "ACTAS",
    "Total\nActas",
  )

  // ── Guías ─────────────────────────────────────────────────────────────────
  writeEntryTable(
    sortedGuias,
    `ROPA ENVIADA DE LAVANDERIA A MINA - ${period.name.toUpperCase()}`,
    "GUIAS",
    "Total\nGuias",
    sortedActas,  // for ● comparison
  )

  // ── Pricing table: Sin IGV (from guías) ──────────────────────────────────
  const pricingCols = 4
  const pricingColStart = 1
  const pricingColEnd = pricingColStart + pricingCols - 1  // col 4

  // Set pricing column widths (cols A-D reuse, but set explicit)
  ws.getColumn(1).width = 30
  ws.getColumn(2).width = 12
  ws.getColumn(3).width = 14
  ws.getColumn(4).width = 16

  // Title
  ws.mergeCells(row, 1, row, pricingColEnd)
  {
    const c = ws.getRow(row).getCell(1)
    c.value = `VALORIZACION - ${period.name.toUpperCase()}`
    styleHeader(c, C_PRIMARY, C_BLACK, true, false, 9)
    ws.getRow(row).height = 16
    row++
  }
  // SIN IGV label
  ws.mergeCells(row, 1, row, pricingColEnd)
  {
    const c = ws.getRow(row).getCell(1)
    c.value = "SIN IGV"
    styleHeader(c, C_PRIMARY_D, C_BLACK, false, true, 8)
    ws.getRow(row).height = 14
    row++
  }
  // Column headers
  {
    const r = ws.getRow(row)
    r.height = 14
    const labels = ["DETALLE", "CANTIDAD", "P.U", "IMPORTE"]
    const aligns: ExcelJS.Alignment["horizontal"][] = ["left", "right", "right", "right"]
    labels.forEach((lbl, i) => {
      const c = r.getCell(1 + i)
      c.value = lbl
      styleHeader(c, C_GREEN, C_BLACK, true, false, 8, aligns[i])
    })
    row++
  }

  // Body rows
  let subtotal = 0
  garmentTypeIds.forEach((gtId, idx) => {
    const bg = idx % 2 === 0 ? C_WHITE : C_ROW_ALT
    const qty = getRowTotal(sortedGuias, gtId)
    const pu = getTypePrice(gtId)
    const importe = qty * pu
    subtotal += importe

    const r = ws.getRow(row)
    r.height = 13
    styleData(r.getCell(1), bg, C_TEXT_DARK, true, "left")
    r.getCell(1).value = getTypeName(gtId)

    styleData(r.getCell(2), bg, C_TEXT_DARK, false, "right")
    r.getCell(2).value = qty > 0 ? qty : 0

    styleData(r.getCell(3), bg, C_TEXT_DARK, false, "right")
    r.getCell(3).value = pu
    r.getCell(3).numFmt = '#,##0.0000'

    styleData(r.getCell(4), bg, C_TEXT_DARK, false, "right")
    r.getCell(4).value = importe
    r.getCell(4).numFmt = '#,##0.00'

    row++
  })

  // Total row
  {
    const r = ws.getRow(row)
    r.height = 15
    ws.mergeCells(row, 1, row, 3)
    styleHeader(r.getCell(1), C_PRIMARY, C_BLACK, true, false, 8, "right")
    r.getCell(1).value = "TOTAL (Sin IGV)"
    applyBorder(r.getCell(2), "FF0090C8")
    applyBorder(r.getCell(3), "FF0090C8")

    const tc = r.getCell(4)
    applyFill(tc, C_PRIMARY)
    applyBorder(tc, "FF0090C8")
    tc.font = { bold: true, size: 8, color: { argb: C_BLACK } }
    tc.alignment = { horizontal: "right", vertical: "middle" }
    tc.value = subtotal
    tc.numFmt = '#,##0.00'
    row++
  }

  // ── Download ──────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `Valorizacion-${period.name.replace(/\s+/g, "-")}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
