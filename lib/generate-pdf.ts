import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { ValorizacionPeriod, GarmentType } from "./types"

interface PdfOptions {
  period: ValorizacionPeriod
  garmentTypes: GarmentType[]
  garmentTypeIds: string[]
  companyName?: string
  ruc?: string
}

function formatShortDate(dateStr: string) {
  const date = new Date(dateStr + "T12:00:00")
  const day = date.getDate()
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  return `${day}-${months[date.getMonth()]}`
}

function formatDateRange(startDate: string, endDate: string) {
  const fmt = (d: string) => {
    const date = new Date(d + "T12:00:00")
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    return `${day}-${month}`
  }
  const endD = new Date(endDate + "T12:00:00")
  const endYear = String(endD.getFullYear()).slice(-2)
  return `DEL ${fmt(startDate)} AL ${fmt(endDate)}-${endYear}`
}

// Color constants (RGB)
const PRIMARY_BG: [number, number, number] = [0, 176, 240]
const PRIMARY_LIGHT: [number, number, number] = [0, 144, 200]
const HEADER_BG: [number, number, number] = [178, 216, 181]
const ROW_ALT: [number, number, number] = [217, 242, 251]
const WHITE: [number, number, number] = [255, 255, 255]
const BLACK: [number, number, number] = [0, 0, 0]
const TEXT_DARK: [number, number, number] = [26, 58, 110]
const ACCENT_BLUE: [number, number, number] = [0, 176, 240]

// Helper to get finalY after autoTable
function getLastY(doc: jsPDF, fallback: number): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? fallback
}

export async function generateValorizacionPdf(options: PdfOptions) {
  const { period, garmentTypes, garmentTypeIds, companyName = "JJ SERVICIOS LIZ E.I.R.L.", ruc = "20534123605" } = options

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()   // 297mm
  const marginL = 10
  const usableW = pageW - marginL - marginL          // 277mm

  const getTypeName = (id: string) => garmentTypes.find(gt => gt.id === id)?.name?.toUpperCase() ?? "DESCONOCIDO"
  const getTypePrice = (id: string) => garmentTypes.find(gt => gt.id === id)?.pricePerUnit ?? 0

  const sortedActas = [...period.actas].sort((a, b) => a.date.localeCompare(b.date))
  const sortedGuias = [...period.guias].sort((a, b) => a.date.localeCompare(b.date))

  const getQty = (entry: { items: { garmentTypeId: string; quantity: number }[] }, gtId: string) =>
    entry.items.find(i => i.garmentTypeId === gtId)?.quantity ?? 0

  const getRowTotal = (entries: { items: { garmentTypeId: string; quantity: number }[] }[], gtId: string) =>
    entries.reduce((sum, e) => sum + getQty(e, gtId), 0)

  // ===== HEADER =====
  let y = 11

  try {
    const logo = await loadImage("/images/logo-liz.png")
    if (logo) doc.addImage(logo, "PNG", marginL, y - 4, 28, 11)
  } catch { /* skip */ }

  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BLACK)
  doc.text(companyName, pageW / 2, y, { align: "center" })
  y += 4
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text("LAVANDERIA", pageW / 2, y, { align: "center" })
  y += 3.5
  doc.setFontSize(7)
  doc.text(`RUC. ${ruc}`, pageW / 2, y, { align: "center" })
  y += 5.5

  // Title bar
  doc.setFillColor(...PRIMARY_BG)
  doc.rect(marginL, y, usableW, 6.5, "F")
  doc.setTextColor(...BLACK)
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "bold")
  doc.text("VALORIZACION DEL SERVICIO DE LAVANDERIA", pageW / 2, y + 4.5, { align: "center" })
  y += 8

  doc.setFillColor(...PRIMARY_LIGHT)
  doc.rect(marginL, y, usableW, 5, "F")
  doc.setFontSize(7)
  doc.text(`PERIODO DEL SERVICIO  ${formatDateRange(period.startDate, period.endDate)}`, pageW / 2, y + 3.5, { align: "center" })
  y += 7

  // ===== TABLE 1: ACTAS (full width) =====
  if (sortedActas.length > 0) {
    drawEntryTable(doc, {
      startY: y,
      marginL,
      tableW: usableW,
      title: `ROPA ENVIADA DE MINA A LAVANDERIA - ${period.name.toUpperCase()}`,
      labelRow: "ACTAS",
      totalLabel: "Total\nActas",
      entries: sortedActas,
      garmentTypeIds,
      getTypeName,
      getQty,
      getRowTotal: (gtId) => getRowTotal(sortedActas, gtId),
    })
    y = getLastY(doc, y) + 4
  }

  // ===== TABLE 2: GUIAS (full width, below actas) =====
  if (sortedGuias.length > 0) {
    drawEntryTable(doc, {
      startY: y,
      marginL,
      tableW: usableW,
      title: `ROPA ENVIADA DE LAVANDERIA A MINA - ${period.name.toUpperCase()}`,
      labelRow: "GUIAS",
      totalLabel: "Total\nGuias",
      entries: sortedGuias,
      garmentTypeIds,
      getTypeName,
      getQty,
      getRowTotal: (gtId) => getRowTotal(sortedGuias, gtId),
      getCompareTotal: (gtId) => getRowTotal(sortedActas, gtId),
    })
    y = getLastY(doc, y) + 4
  }

  // ===== PRICING TABLE: SIN IGV (calculado con Guías) =====
  drawPricingTable(doc, {
    startY: y,
    marginL,
    tableW: 120,
    period,
    garmentTypeIds,
    getTypeName,
    getTypePrice,
    getRowTotal: (gtId) => getRowTotal(sortedGuias, gtId),
    includeIgv: false,
  })
  y = getLastY(doc, y) + 12

  // ===== SIGNATURE =====
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...BLACK)
  doc.line(marginL, y, marginL + 50, y)
  y += 4
  doc.text(companyName, marginL, y)
  y += 4
  doc.setFont("helvetica", "bold")
  doc.text("GERENTE", marginL, y)

  doc.save(`Valorizacion-${period.name.replace(/\s+/g, "-")}.pdf`)
}

// ===== Draw entry table (actas or guias) =====
interface EntryTableOpts {
  startY: number
  marginL: number
  tableW: number
  title: string
  labelRow: string
  totalLabel: string
  entries: { id: string; number: string; date: string; items: { garmentTypeId: string; quantity: number }[] }[]
  garmentTypeIds: string[]
  getTypeName: (id: string) => string
  getQty: (entry: { items: { garmentTypeId: string; quantity: number }[] }, gtId: string) => number
  getRowTotal: (gtId: string) => number
  /** Si se provee, marca con ● las filas cuyo total difiera */
  getCompareTotal?: (gtId: string) => number
}

function drawEntryTable(doc: jsPDF, opts: EntryTableOpts): void {
  const { startY, marginL, tableW, title, labelRow, totalLabel, entries, garmentTypeIds, getTypeName, getQty, getRowTotal, getCompareTotal } = opts

  const cols = entries.length
  const nameColW = 28
  const totalColW = 18
  const availW = tableW - nameColW - totalColW
  const dateColW = cols > 0 ? Math.min(16, availW / cols) : 14
  const effectiveW = nameColW + dateColW * cols + totalColW

  const head1: string[] = ["FECHA", ...entries.map(e => formatShortDate(e.date)), totalLabel]
  const head2: string[] = [labelRow, ...entries.map(e => e.number || "-"), ""]

  const body: string[][] = garmentTypeIds.map(gtId => {
    const rowTotal = getRowTotal(gtId)
    const hasDiff = getCompareTotal ? getCompareTotal(gtId) !== rowTotal : false
    const row: string[] = [getTypeName(gtId)]
    for (const entry of entries) {
      const q = getQty(entry, gtId)
      row.push(q > 0 ? q.toLocaleString() : "")
    }
    row.push((rowTotal > 0 ? rowTotal.toLocaleString() : "") + (hasDiff ? " ●" : ""))
    return row
  })

  const colStyles: Record<number, { cellWidth: number; halign: "left" | "center" | "right" }> = {
    0: { cellWidth: nameColW, halign: "left" },
  }
  for (let i = 1; i <= cols; i++) colStyles[i] = { cellWidth: dateColW, halign: "center" }
  colStyles[cols + 1] = { cellWidth: totalColW, halign: "right" }

  autoTable(doc, {
    startY,
    margin: { left: marginL },
    tableWidth: effectiveW,
    columnStyles: colStyles,
    head: [
      [{ content: title, colSpan: cols + 2, styles: { halign: "center", fillColor: HEADER_BG, textColor: BLACK, fontSize: 6.5, fontStyle: "bold" } }],
      head1.map((text, idx) => ({
        content: text,
        styles: {
          halign: (idx === 0 ? "left" : "center") as "left" | "center",
          fillColor: HEADER_BG,
          textColor: BLACK,
          fontSize: 6.5,
          fontStyle: "bold" as const,
        },
      })),
      head2.map((text, idx) => ({
        content: text,
        styles: {
          halign: (idx === 0 ? "left" : "center") as "left" | "center",
          fillColor: HEADER_BG,
          textColor: BLACK,
          fontSize: 6.5,
          fontStyle: "bold" as const,
        },
      })),
    ],
    body: body.map((row, rIdx) =>
      row.map((cell, cIdx) => ({
        content: cell,
        styles: {
          halign: (cIdx === 0 ? "left" : cIdx === row.length - 1 ? "right" : "center") as "left" | "center" | "right",
          fillColor: rIdx % 2 === 0 ? WHITE : ROW_ALT,
          textColor: cIdx === row.length - 1 ? ACCENT_BLUE : TEXT_DARK,
          fontStyle: (cIdx === row.length - 1 ? "bold" : "normal") as "bold" | "normal",
          fontSize: 6.5,
        },
      }))
    ),
    theme: "grid",
    styles: { lineColor: [180, 180, 180], lineWidth: 0.2, cellPadding: 1, fontSize: 6.5 },
  })
}

// ===== Draw pricing table (sin or con IGV) =====
interface PricingTableOpts {
  startY: number
  marginL: number
  tableW: number
  period: ValorizacionPeriod
  garmentTypeIds: string[]
  getTypeName: (id: string) => string
  getTypePrice: (id: string) => number
  getRowTotal: (gtId: string) => number
  includeIgv: boolean
}

function drawPricingTable(doc: jsPDF, opts: PricingTableOpts): void {
  const { startY, marginL, tableW, period, garmentTypeIds, getTypeName, getTypePrice, getRowTotal, includeIgv } = opts

  const puFactor = includeIgv ? 1.18 : 1
  const fmtPU = includeIgv
    ? (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 6 })
  const fmtMoney = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  let subtotal = 0
  const itemRows: string[][] = garmentTypeIds.map(gtId => {
    const qty = getRowTotal(gtId)
    const pu = getTypePrice(gtId) * puFactor
    const importe = qty * pu
    subtotal += importe
    return [getTypeName(gtId), qty > 0 ? qty.toLocaleString() : "0", fmtPU(pu), fmtMoney(importe)]
  })

  // Para includeIgv, el subtotal ya lleva el IGV incluido en el PU
  // Para sinIgv, calculamos el IGV aparte para el footer
  const baseSubtotal = includeIgv ? subtotal / 1.18 : subtotal
  const igv = baseSubtotal * 0.18

  const summaryRows: string[][] = includeIgv
    ? [
        ["SUB TOTAL", "", "", fmtMoney(baseSubtotal)],
        ["I.G.V. (18%)", "", "", fmtMoney(igv)],
        ["TOTAL", "", "", fmtMoney(subtotal)],
      ]
    : [["TOTAL (Sin IGV)", "", "", fmtMoney(subtotal)]]

  const label = includeIgv ? "CON IGV (18%)" : "SIN IGV"
  const colW = [tableW - 60, 20, 18, 22]  // dynamic: name fills remaining

  autoTable(doc, {
    startY,
    margin: { left: marginL },
    tableWidth: tableW,
    columnStyles: {
      0: { cellWidth: colW[0], halign: "left" },
      1: { cellWidth: colW[1], halign: "right" },
      2: { cellWidth: colW[2], halign: "right" },
      3: { cellWidth: colW[3], halign: "right" },
    },
    head: [
      [{ content: `VALORIZACION - ${period.name.toUpperCase()}`, colSpan: 4, styles: { halign: "center", fillColor: PRIMARY_BG, textColor: BLACK, fontSize: 7, fontStyle: "bold" } }],
      [{ content: label, colSpan: 4, styles: { halign: "center", fillColor: PRIMARY_LIGHT, textColor: BLACK, fontSize: 6.5, fontStyle: "italic" } }],
      ["DETALLE", "CANTIDAD", "P.U", "IMPORTE"].map(text => ({
        content: text,
        styles: { halign: "center" as const, fillColor: HEADER_BG, textColor: BLACK, fontSize: 6.5, fontStyle: "bold" as const },
      })),
    ],
    body: [
      ...itemRows.map((row, rIdx) =>
        row.map((cell, cIdx) => ({
          content: cell,
          styles: {
            halign: (cIdx === 0 ? "left" : "right") as "left" | "right",
            fillColor: rIdx % 2 === 0 ? WHITE : ROW_ALT,
            textColor: BLACK,
            fontSize: 6.5,
          },
        }))
      ),
      ...summaryRows.map((row, sIdx) => {
        const isLast = sIdx === summaryRows.length - 1
        return row.map((cell, cIdx) => ({
          content: cell,
          styles: {
            halign: (cIdx === 0 ? "left" : "right") as "left" | "right",
            fillColor: isLast ? PRIMARY_BG : HEADER_BG,
            textColor: BLACK,
            fontStyle: "bold" as const,
            fontSize: 6.5,
          },
        }))
      }),
    ],
    theme: "grid",
    styles: { lineColor: [180, 180, 180], lineWidth: 0.2, cellPadding: 1, fontSize: 6.5 },
  })
}

// ===== Image loader =====
function loadImage(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(null); return }
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) { resolve(null); return }
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL("image/png"))
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}
