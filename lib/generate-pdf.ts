import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { ValorizacionPeriod, GarmentType } from "./types"

interface PdfOptions {
  period: ValorizacionPeriod
  garmentTypes: GarmentType[]
  garmentTypeIds: string[]
  companyName?: string
  ruc?: string
  logoUrl?: string
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
    const year = String(date.getFullYear()).slice(-2)
    return `${day}-${month}`
  }
  const endD = new Date(endDate + "T12:00:00")
  const endYear = String(endD.getFullYear()).slice(-2)
  return `DEL ${fmt(startDate)} AL ${fmt(endDate)}-${endYear}`
}

// Color constants (RGB)
const PRIMARY_BG: [number, number, number] = [45, 50, 80]
const PRIMARY_LIGHT: [number, number, number] = [70, 80, 130]
const HEADER_BG: [number, number, number] = [176, 216, 230]
const ROW_ALT: [number, number, number] = [240, 245, 250]
const WHITE: [number, number, number] = [255, 255, 255]
const BLACK: [number, number, number] = [0, 0, 0]
const ACCENT_GREEN: [number, number, number] = [0, 128, 100]

export async function generateValorizacionPdf(options: PdfOptions) {
  const { period, garmentTypes, garmentTypeIds, companyName = "JJ SERVICIOS LIZ E.I.R.L.", ruc = "20534123605" } = options

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginL = 10
  const marginR = 10
  const usableW = pageW - marginL - marginR

  // Helpers
  const getTypeName = (id: string) => garmentTypes.find(gt => gt.id === id)?.name?.toUpperCase() ?? "DESCONOCIDO"
  const getTypePrice = (id: string) => garmentTypes.find(gt => gt.id === id)?.pricePerUnit ?? 0

  const sortedActas = [...period.actas].sort((a, b) => a.date.localeCompare(b.date))
  const sortedGuias = [...period.guias].sort((a, b) => a.date.localeCompare(b.date))

  const getQty = (entry: { items: { garmentTypeId: string; quantity: number }[] }, gtId: string) => {
    return entry.items.find(i => i.garmentTypeId === gtId)?.quantity ?? 0
  }

  const getRowTotal = (entries: { items: { garmentTypeId: string; quantity: number }[] }[], gtId: string) => {
    return entries.reduce((sum, e) => sum + getQty(e, gtId), 0)
  }

  // ===== PAGE 1: VALORIZACION DEL SERVICIO =====

  // -- Company header --
  let y = 12

  // Try to load and add logo
  try {
    const logo = await loadImage("/images/logo-liz.png")
    if (logo) {
      doc.addImage(logo, "PNG", marginL, y - 4, 35, 14)
    }
  } catch {
    // If logo fails, skip
  }

  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BLACK)
  doc.text(companyName, pageW / 2, y, { align: "center" })
  y += 5
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text("LAVANDERIA", pageW / 2, y, { align: "center" })
  y += 4
  doc.setFontSize(8)
  doc.text(`RUC. ${ruc}`, pageW / 2, y, { align: "center" })
  y += 7

  // -- Main title --
  doc.setFillColor(...PRIMARY_BG)
  doc.rect(marginL, y, usableW, 8, "F")
  doc.setTextColor(...WHITE)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("VALORIZACION DEL SERVICIO DE LAVANDERIA", pageW / 2, y + 5.5, { align: "center" })
  y += 10

  doc.setFillColor(...PRIMARY_LIGHT)
  doc.rect(marginL, y, usableW, 6, "F")
  doc.setFontSize(8)
  doc.text(`PERIODO DEL SERVICIO  ${formatDateRange(period.startDate, period.endDate)}`, pageW / 2, y + 4, { align: "center" })
  y += 9

  // ===== TABLE 1: ACTAS (Mina -> Lavanderia) =====
  if (sortedActas.length > 0) {
    y = drawEntryTable(doc, {
      y,
      marginL,
      usableW,
      title: `ROPA DE CAMA ENVIADAS DE MINA A LAVANDERIA  PERIODO DE ${period.name.toUpperCase()}`,
      labelRow: "ACTAS",
      totalLabel: "Total en\nActas",
      entries: sortedActas,
      garmentTypeIds,
      getTypeName,
      getQty,
      getRowTotal: (gtId) => getRowTotal(sortedActas, gtId),
    })
    y += 4
  }

  // ===== TABLE 2: GUIAS (Lavanderia -> Mina) =====
  if (sortedGuias.length > 0) {
    // Check if there is enough space, otherwise new page
    if (y > pageH - 60) {
      doc.addPage()
      y = 12
    }

    y = drawEntryTable(doc, {
      y,
      marginL,
      usableW,
      title: `ROPA DE CAMA ENVIADA DE LAVANDERIA A MINA - PERIODO ${period.name.toUpperCase()}`,
      labelRow: "GUIAS",
      totalLabel: "Total en\nGuias",
      entries: sortedGuias,
      garmentTypeIds,
      getTypeName,
      getQty,
      getRowTotal: (gtId) => getRowTotal(sortedGuias, gtId),
    })
    y += 4
  }

  // ===== VALORIZACION PRICING TABLE (on same page if fits, else new page) =====
  if (y > pageH - 55) {
    doc.addPage()
    y = 12
  }

  y = drawPricingTable(doc, {
    y,
    marginL,
    period,
    garmentTypeIds,
    garmentTypes,
    getTypeName,
    getTypePrice,
    getRowTotal: (gtId) => getRowTotal(sortedActas, gtId),
  })

  // ===== PAGE 2: VALORIZACION Y ENTREGABLES =====
  doc.addPage("a4", "portrait")
  y = drawEntregablesPage(doc, {
    period,
    garmentTypeIds,
    garmentTypes,
    getTypeName,
    getTypePrice,
    getRowTotal: (gtId) => getRowTotal(sortedActas, gtId),
    companyName,
    ruc,
  })

  // Download
  doc.save(`Valorizacion-${period.name.replace(/\s+/g, "-")}.pdf`)
}

// ===== Draw entry table (actas or guias) =====
interface EntryTableOpts {
  y: number
  marginL: number
  usableW: number
  title: string
  labelRow: string
  totalLabel: string
  entries: { id: string; number: string; date: string; items: { garmentTypeId: string; quantity: number }[] }[]
  garmentTypeIds: string[]
  getTypeName: (id: string) => string
  getQty: (entry: { items: { garmentTypeId: string; quantity: number }[] }, gtId: string) => number
  getRowTotal: (gtId: string) => number
}

function drawEntryTable(doc: jsPDF, opts: EntryTableOpts): number {
  const { y: startY, marginL, usableW, title, labelRow, totalLabel, entries, garmentTypeIds, getTypeName, getQty, getRowTotal } = opts

  const cols = entries.length
  const nameColW = 32
  const totalColW = 22
  const dateColW = Math.min(18, (usableW - nameColW - totalColW) / Math.max(cols, 1))
  const tableW = nameColW + (dateColW * cols) + totalColW

  // Build header
  const head1: string[] = ["FECHA", ...entries.map(e => formatShortDate(e.date)), totalLabel]
  const head2: string[] = [labelRow, ...entries.map(e => e.number || "-"), ""]

  // Build body
  const body: (string | number)[][] = garmentTypeIds.map(gtId => {
    const row: (string | number)[] = [getTypeName(gtId)]
    for (const entry of entries) {
      const q = getQty(entry, gtId)
      row.push(q > 0 ? q.toLocaleString() : "")
    }
    row.push(getRowTotal(gtId) > 0 ? getRowTotal(gtId).toLocaleString() : "")
    return row
  })

  const colStyles: { [key: number]: { cellWidth: number; halign: "left" | "center" | "right" } } = {
    0: { cellWidth: nameColW, halign: "left" },
  }
  for (let i = 1; i <= cols; i++) {
    colStyles[i] = { cellWidth: dateColW, halign: "center" }
  }
  colStyles[cols + 1] = { cellWidth: totalColW, halign: "right" }

  let finalY = startY

  autoTable(doc, {
    startY,
    margin: { left: marginL },
    tableWidth: tableW,
    head: [
      [{ content: title, colSpan: cols + 2, styles: { halign: "center", fillColor: HEADER_BG, textColor: BLACK, fontSize: 7, fontStyle: "bold" } }],
      head1.map((text, idx) => ({
        content: text,
        styles: {
          halign: idx === 0 ? "left" as const : (idx === cols + 1 ? "center" as const : "center" as const),
          fillColor: HEADER_BG,
          textColor: BLACK,
          fontSize: 7,
          fontStyle: "bold" as const,
        },
      })),
      head2.map((text, idx) => ({
        content: text,
        styles: {
          halign: idx === 0 ? "left" as const : "center" as const,
          fillColor: HEADER_BG,
          textColor: BLACK,
          fontSize: 7,
          fontStyle: "bold" as const,
        },
      })),
    ],
    body: body.map((row, rIdx) =>
      row.map((cell, cIdx) => ({
        content: String(cell),
        styles: {
          halign: cIdx === 0 ? "left" as const : (cIdx === row.length - 1 ? "right" as const : "center" as const),
          fillColor: rIdx % 2 === 0 ? WHITE : ROW_ALT,
          textColor: cIdx === row.length - 1 ? ACCENT_GREEN : BLACK,
          fontStyle: cIdx === row.length - 1 ? "bold" as const : "normal" as const,
          fontSize: 7,
        },
      }))
    ),
    theme: "grid",
    styles: {
      lineColor: [180, 180, 180],
      lineWidth: 0.2,
      cellPadding: 1.5,
      fontSize: 7,
    },
    didDrawPage: (data) => {
      finalY = data.cursor?.y ?? startY
    },
  })

  return finalY
}

// ===== Draw pricing table =====
interface PricingTableOpts {
  y: number
  marginL: number
  period: ValorizacionPeriod
  garmentTypeIds: string[]
  garmentTypes: GarmentType[]
  getTypeName: (id: string) => string
  getTypePrice: (id: string) => number
  getRowTotal: (gtId: string) => number
}

function drawPricingTable(doc: jsPDF, opts: PricingTableOpts): number {
  const { y: startY, marginL, period, garmentTypeIds, getTypeName, getTypePrice, getRowTotal } = opts
  const tableW = 120

  let subtotal = 0
  const body: string[][] = garmentTypeIds.map(gtId => {
    const qty = getRowTotal(gtId)
    const pu = getTypePrice(gtId)
    const importe = qty * pu
    subtotal += importe
    return [
      getTypeName(gtId),
      qty > 0 ? qty.toLocaleString() : "0",
      pu.toFixed(2),
      importe > 0 ? importe.toFixed(2) : "0.00",
    ]
  })

  // Add TOTAL row
  body.push(["TOTAL", "", "", subtotal.toFixed(2)])

  let finalY = startY

  autoTable(doc, {
    startY,
    margin: { left: marginL },
    tableWidth: tableW,
    head: [
      [
        { content: `VALORIZACION - ${period.name.toUpperCase()}`, colSpan: 4, styles: { halign: "center", fillColor: PRIMARY_BG, textColor: WHITE, fontSize: 8, fontStyle: "bold" } },
      ],
      [
        { content: "NO INCLUYE IGV", colSpan: 4, styles: { halign: "center", fillColor: PRIMARY_LIGHT, textColor: WHITE, fontSize: 7, fontStyle: "italic" } },
      ],
      ["DETALLE", "CANTIDAD", "P.U", "IMPORTE"].map(text => ({
        content: text,
        styles: { halign: "center" as const, fillColor: HEADER_BG, textColor: BLACK, fontSize: 7, fontStyle: "bold" as const },
      })),
    ],
    body: body.map((row, rIdx) => {
      const isTotal = rIdx === body.length - 1
      return row.map((cell, cIdx) => ({
        content: cell,
        styles: {
          halign: cIdx === 0 ? "left" as const : "right" as const,
          fontStyle: isTotal ? "bold" as const : "normal" as const,
          fillColor: isTotal ? HEADER_BG : (rIdx % 2 === 0 ? WHITE : ROW_ALT),
          textColor: isTotal ? BLACK : BLACK,
          fontSize: 7,
        },
      }))
    }),
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
    },
    theme: "grid",
    styles: {
      lineColor: [180, 180, 180],
      lineWidth: 0.2,
      cellPadding: 1.5,
      fontSize: 7,
    },
    didDrawPage: (data) => {
      finalY = data.cursor?.y ?? startY
    },
  })

  return finalY
}

// ===== PAGE 2: ENTREGABLES =====
interface EntregablesOpts {
  period: ValorizacionPeriod
  garmentTypeIds: string[]
  garmentTypes: GarmentType[]
  getTypeName: (id: string) => string
  getTypePrice: (id: string) => number
  getRowTotal: (gtId: string) => number
  companyName: string
  ruc: string
}

function drawEntregablesPage(doc: jsPDF, opts: EntregablesOpts): number {
  const { period, garmentTypeIds, getTypeName, getTypePrice, getRowTotal, companyName } = opts
  const pageW = doc.internal.pageSize.getWidth()
  const marginL = 20

  let y = 20

  // Title
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BLACK)
  doc.text("VALORIZACION Y ENTREGABLES DE LAVANDERIA ROPA DE CAMA", pageW / 2, y, { align: "center" })
  y += 6
  doc.setFontSize(10)
  doc.text(`PERIODO ${formatDateRange(period.startDate, period.endDate)}`, pageW / 2, y, { align: "center" })
  y += 10

  let subtotal = 0
  const body: string[][] = garmentTypeIds.map(gtId => {
    const qty = getRowTotal(gtId)
    const pu = getTypePrice(gtId)
    const total = qty * pu
    subtotal += total
    return [
      getTypeName(gtId),
      qty > 0 ? qty.toLocaleString() : "0",
      `S/ ${pu.toFixed(2)}`,
      `S/ ${total.toFixed(2)}`,
    ]
  })

  const igv = subtotal * 0.18
  const grandTotal = subtotal + igv

  // Separator rows
  body.push(["SUB TOTAL", "", "", `S/ ${subtotal.toFixed(2)}`])
  body.push(["I.G.V. (18%)", "", "", `S/ ${igv.toFixed(2)}`])
  body.push(["TOTAL", "", "", `S/ ${grandTotal.toFixed(2)}`])

  let finalY = y

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginL },
    head: [
      ["ITEM", "CANT.", "PRECIO UNIT.", "PRECIO TOTAL"].map(text => ({
        content: text,
        styles: { halign: "center" as const, fillColor: PRIMARY_BG, textColor: WHITE, fontSize: 9, fontStyle: "bold" as const },
      })),
    ],
    body: body.map((row, rIdx) => {
      const isSummary = rIdx >= body.length - 3
      const isGrandTotal = rIdx === body.length - 1
      return row.map((cell, cIdx) => ({
        content: cell,
        styles: {
          halign: cIdx === 0 ? "left" as const : (cIdx === 3 ? "right" as const : "center" as const),
          fontStyle: (isSummary ? "bold" : "normal") as "bold" | "normal",
          fillColor: isGrandTotal ? PRIMARY_BG : (isSummary ? HEADER_BG : (rIdx % 2 === 0 ? WHITE : ROW_ALT)),
          textColor: isGrandTotal ? WHITE : BLACK,
          fontSize: 9,
        },
      }))
    }),
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 25 },
      2: { cellWidth: 35 },
      3: { cellWidth: 40 },
    },
    theme: "grid",
    styles: {
      lineColor: [180, 180, 180],
      lineWidth: 0.3,
      cellPadding: 3,
      fontSize: 9,
    },
    didDrawPage: (data) => {
      finalY = data.cursor?.y ?? y
    },
  })

  // Signature area
  finalY += 25
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...BLACK)
  doc.line(marginL, finalY, marginL + 55, finalY)
  finalY += 4
  doc.text(companyName, marginL, finalY)
  finalY += 4
  doc.setFont("helvetica", "bold")
  doc.text("GERENTE", marginL, finalY)

  return finalY
}

// ===== Image loader =====
function loadImage(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null)
      return
    }
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(null)
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL("image/png"))
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}
