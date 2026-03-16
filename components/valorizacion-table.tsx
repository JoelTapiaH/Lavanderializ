"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Trash2, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Acta, Guia, GarmentType, ValorizacionItem } from "@/lib/types"

interface ValorizacionTableProps {
  type: "acta" | "guia"
  entries: Acta[] | Guia[]
  garmentTypeIds: string[]
  garmentTypes: GarmentType[]
  valorizacionId: string
  onUpdateEntry: (entryId: string, number: string, date: string, items: ValorizacionItem[]) => void
  onDeleteEntry: (id: string) => void
  onAddEntry: (number: string, date: string, items: ValorizacionItem[]) => void
}

function formatShortDate(dateStr: string) {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("es-PE", { day: "numeric", month: "short" })
}

// Single editable cell for quantities
function EditableCell({
  value,
  onSave,
  className,
}: {
  value: number
  onSave: (val: number) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value.toString())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value.toString())
  }, [value])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function commit() {
    setEditing(false)
    const num = parseInt(draft, 10)
    if (!isNaN(num) && num >= 0 && num !== value) {
      onSave(num)
    } else {
      setDraft(value.toString())
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min="0"
        className="w-full bg-transparent text-center text-xs tabular-nums outline-none py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      style={{ borderBottom: "2px solid #00b0f0", color: "#1a3a6e" }}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") {
            setDraft(value.toString())
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <button
      type="button"
      className={`w-full text-center text-xs tabular-nums cursor-text rounded px-1 py-0.5 transition-colors ${className ?? ""}`}
      style={{ color: "#1a3a6e" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,176,240,0.10)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      onClick={() => setEditing(true)}
      title="Clic para editar"
    >
      {value > 0 ? value.toLocaleString() : <span style={{ color: "#8cd7f0" }}>-</span>}
    </button>
  )
}

// Editable text cell for header fields (date, number)
function EditableHeaderCell({
  value,
  onSave,
  type = "text",
  placeholder,
  colorOverride,
}: {
  value: string
  onSave: (val: string) => void
  type?: "text" | "date"
  placeholder?: string
  colorOverride?: { text: string; hoverBg: string; borderColor: string }
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function commit() {
    setEditing(false)
    if (draft !== value) {
      onSave(draft)
    }
  }

  const textColor = colorOverride?.text ?? "var(--color-primary-foreground)"
  const borderCol = colorOverride?.borderColor ?? "var(--color-primary-foreground)"
  const hoverBg = colorOverride?.hoverBg ?? "rgba(255,255,255,0.10)"

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        className="w-full min-w-[80px] bg-transparent text-center text-xs font-semibold outline-none py-0.5"
        style={{ color: textColor, borderBottom: `2px solid ${borderCol}` }}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") {
            setDraft(value)
            setEditing(false)
          }
        }}
      />
    )
  }

  const displayValue = type === "date" && value ? formatShortDate(value) : value

  return (
    <button
      type="button"
      className="w-full text-center text-xs font-semibold cursor-text rounded px-1 py-0.5 transition-colors"
      style={{ color: textColor }}
      onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      onClick={() => setEditing(true)}
      title="Clic para editar"
    >
      {displayValue || <span className="opacity-50">{placeholder ?? "-"}</span>}
    </button>
  )
}

export function ValorizacionTable({
  type,
  entries,
  garmentTypeIds,
  garmentTypes,
  valorizacionId,
  onUpdateEntry,
  onDeleteEntry,
  onAddEntry,
}: ValorizacionTableProps) {
  const label = type === "acta" ? "Actas" : "Guias"
  const totalLabel = type === "acta" ? "Total en Actas" : "Total en Guias"

  // New column state
  const [addingColumn, setAddingColumn] = useState(false)
  const [newDate, setNewDate] = useState("")
  const [newNumber, setNewNumber] = useState("")
  const [newQuantities, setNewQuantities] = useState<Record<string, number>>({})

  // New row state
  const [addingRow, setAddingRow] = useState(false)
  const [newRowGarmentId, setNewRowGarmentId] = useState("")

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries]
  )

  const getTypeName = (id: string) =>
    garmentTypes.find((gt) => gt.id === id)?.name ?? "Desconocido"

  const getQty = (entry: Acta | Guia, garmentTypeId: string) => {
    const item = entry.items.find((i) => i.garmentTypeId === garmentTypeId)
    return item?.quantity ?? 0
  }

  const getRowTotal = (garmentTypeId: string) =>
    sortedEntries.reduce((sum, entry) => sum + getQty(entry, garmentTypeId), 0)

  const grandTotal = garmentTypeIds.reduce(
    (sum, gtId) => sum + getRowTotal(gtId),
    0
  )

  // Available garment types not yet in the table
  const availableGarmentTypes = garmentTypes.filter(
    (gt) => !garmentTypeIds.includes(gt.id)
  )

  // Handler: update a single cell quantity
  const handleCellUpdate = useCallback(
    (entry: Acta | Guia, garmentTypeId: string, newQty: number) => {
      const existingItem = entry.items.find(
        (i) => i.garmentTypeId === garmentTypeId
      )
      let newItems: ValorizacionItem[]
      if (existingItem) {
        newItems = entry.items.map((i) =>
          i.garmentTypeId === garmentTypeId
            ? { ...i, quantity: newQty }
            : i
        )
      } else {
        newItems = [
          ...entry.items,
          { garmentTypeId, quantity: newQty },
        ]
      }
      onUpdateEntry(
        entry.id,
        (entry as Acta | Guia).number || "",
        entry.date,
        newItems
      )
    },
    [onUpdateEntry]
  )

  // Handler: update header date
  const handleDateUpdate = useCallback(
    (entry: Acta | Guia, newDate: string) => {
      if (!newDate) return
      onUpdateEntry(
        entry.id,
        (entry as Acta | Guia).number || "",
        newDate,
        entry.items
      )
    },
    [onUpdateEntry]
  )

  // Handler: update header number
  const handleNumberUpdate = useCallback(
    (entry: Acta | Guia, newNumber: string) => {
      onUpdateEntry(entry.id, newNumber, entry.date, entry.items)
    },
    [onUpdateEntry]
  )

  // Handler: commit new column
  function commitNewColumn() {
    if (!newDate) return
    const items: ValorizacionItem[] = Object.entries(newQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([garmentTypeId, quantity]) => ({ garmentTypeId, quantity }))
    onAddEntry(newNumber.trim(), newDate, items)
    setAddingColumn(false)
    setNewDate("")
    setNewNumber("")
    setNewQuantities({})
  }

  // Handler: add a new garment row to ALL existing entries (with qty 0)
  function commitNewRow() {
    if (!newRowGarmentId) return
    // We just need to touch at least one entry to make the garment type appear.
    // Adding qty 0 item to first entry is enough since allGarmentTypeIds is computed from all entries.
    // But actually we should add it to all entries so totals make sense.
    // Simplest: add to the first entry with qty 0 which will surface the row.
    if (sortedEntries.length > 0) {
      const entry = sortedEntries[0]
      const newItems = [...entry.items, { garmentTypeId: newRowGarmentId, quantity: 0 }]
      onUpdateEntry(
        entry.id,
        (entry as Acta | Guia).number || "",
        entry.date,
        newItems
      )
    }
    setAddingRow(false)
    setNewRowGarmentId("")
  }

  const totalCols = sortedEntries.length + (addingColumn ? 1 : 0) + 2

  return (
    <div className="overflow-x-auto rounded-lg" style={{ border: "2px solid #00b0f0" }}>
      <table className="w-full border-collapse text-sm">
        <thead>
          {/* Title bar */}
          <tr>
            <th
              colSpan={totalCols}
              className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide"
              style={{ background: "#00b0f0", color: "#000000", borderBottom: "2px solid #0090c8" }}
            >
              {type === "acta"
                ? "Ropa de Cama Enviadas de Mina a Lavanderia"
                : "Ropa de Cama Enviada de Lavanderia a Mina"}
            </th>
          </tr>
          {/* Fecha row */}
          <tr style={{ background: "#b2d8b5" }}>
            <th className="border px-3 py-2 text-left text-xs font-bold uppercase" style={{ color: "#000000", borderColor: "#8aba8e" }}>
              Fecha
            </th>
            {sortedEntries.map((entry) => (
              <th
                key={entry.id}
                className="border px-1 py-1 min-w-[90px]"
                style={{ borderColor: "#8aba8e" }}
              >
                <EditableHeaderCell
                  value={entry.date}
                  type="date"
                  onSave={(val) => handleDateUpdate(entry, val)}
                  colorOverride={{ text: "#000000", hoverBg: "rgba(0,0,0,0.08)", borderColor: "#000000" }}
                />
              </th>
            ))}
            {addingColumn && (
              <th className="border px-1 py-1 min-w-[90px]" style={{ borderColor: "#8aba8e" }}>
                <input
                  type="date"
                  className="w-full bg-transparent text-center text-xs font-semibold outline-none"
                  style={{ color: "#000000" }}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </th>
            )}
            <th
              className="border px-3 py-2 text-center text-xs font-bold min-w-[100px]"
              style={{ color: "#000000", borderColor: "#8aba8e" }}
              rowSpan={2}
            >
              {totalLabel}
            </th>
          </tr>
          {/* Numbers row */}
          <tr style={{ background: "#b2d8b5" }}>
            <th className="border px-3 py-1.5 text-left text-xs font-bold uppercase" style={{ color: "#000000", borderColor: "#8aba8e" }}>
              {label}
            </th>
            {sortedEntries.map((entry) => (
              <th
                key={entry.id}
                className="border px-1 py-1"
                style={{ borderColor: "#8aba8e" }}
              >
                <EditableHeaderCell
                  value={(entry as Acta | Guia).number || ""}
                  placeholder="N."
                  onSave={(val) => handleNumberUpdate(entry, val)}
                  colorOverride={{ text: "#000000", hoverBg: "rgba(0,0,0,0.08)", borderColor: "#000000" }}
                />
              </th>
            ))}
            {addingColumn && (
              <th className="border px-1 py-1" style={{ borderColor: "#8aba8e" }}>
                <input
                  type="text"
                  className="w-full bg-transparent text-center text-xs font-semibold outline-none"
                  style={{ color: "#000000" }}
                  value={newNumber}
                  placeholder="N."
                  onChange={(e) => setNewNumber(e.target.value)}
                />
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {garmentTypeIds.map((gtId, idx) => {
            const rowTotal = getRowTotal(gtId) + (addingColumn ? (newQuantities[gtId] ?? 0) : 0)
            const rowBg = idx % 2 === 0 ? "#ffffff" : "#d9f2fb"
            return (
              <tr key={gtId} style={{ background: rowBg }}>
                <td className="border px-3 py-1 text-xs font-bold uppercase whitespace-nowrap" style={{ borderColor: "#8cd7f0", color: "#1a3a6e" }}>
                  {getTypeName(gtId)}
                </td>
                {sortedEntries.map((entry) => (
                  <td
                    key={entry.id}
                    className="border px-1 py-0.5"
                    style={{ borderColor: "#8cd7f0" }}
                  >
                    <EditableCell
                      value={getQty(entry, gtId)}
                      onSave={(val) => handleCellUpdate(entry, gtId, val)}
                    />
                  </td>
                ))}
                {addingColumn && (
                  <td className="border px-1 py-0.5" style={{ borderColor: "#8cd7f0" }}>
                    <input
                      type="number"
                      min="0"
                      className="w-full bg-transparent text-center text-xs tabular-nums outline-none py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{ borderBottom: "1px dashed #00b0f0" }}
                      value={newQuantities[gtId] ?? ""}
                      placeholder="-"
                      onChange={(e) =>
                        setNewQuantities((prev) => ({
                          ...prev,
                          [gtId]: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                    />
                  </td>
                )}
                <td className="border px-3 py-1 text-right text-xs font-bold tabular-nums" style={{ borderColor: "#8cd7f0", color: "#00b0f0" }}>
                  {rowTotal > 0 ? rowTotal.toLocaleString() : ""}
                </td>
              </tr>
            )
          })}

          {/* Add garment row */}
          {addingRow && (
            <tr style={{ background: "#e5f6fd" }}>
              <td className="border px-2 py-1" colSpan={totalCols} style={{ borderColor: "#8cd7f0" }}>
                <div className="flex items-center gap-2">
                  <Select value={newRowGarmentId} onValueChange={setNewRowGarmentId}>
                    <SelectTrigger className="h-7 w-[200px] text-xs">
                      <SelectValue placeholder="Seleccionar prenda..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGarmentTypes.map((gt) => (
                        <SelectItem key={gt.id} value={gt.id}>
                          {gt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={commitNewRow} disabled={!newRowGarmentId}>
                    <Check className="mr-1 h-3 w-3" />
                    Agregar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => { setAddingRow(false); setNewRowGarmentId("") }}>
                    Cancelar
                  </Button>
                </div>
              </td>
            </tr>
          )}

          {/* Grand total row */}
          <tr style={{ background: "#00b0f0" }}>
            <td className="border px-3 py-2 text-xs font-bold uppercase" style={{ color: "#000000", borderColor: "#0090c8" }}>
              Total General
            </td>
            {sortedEntries.map((entry) => {
              const colTotal = garmentTypeIds.reduce(
                (sum, gtId) => sum + getQty(entry, gtId),
                0
              )
              return (
                <td
                  key={entry.id}
                  className="border px-3 py-2 text-center text-xs font-bold tabular-nums"
                  style={{ color: "#000000", borderColor: "#0090c8" }}
                >
                  {colTotal > 0 ? colTotal.toLocaleString() : ""}
                </td>
              )
            })}
            {addingColumn && (
              <td className="border px-3 py-2 text-center text-xs font-bold tabular-nums" style={{ color: "#000000", borderColor: "#0090c8" }}>
                {Object.values(newQuantities).reduce((s, v) => s + v, 0) || ""}
              </td>
            )}
            <td className="border px-3 py-2 text-right text-xs font-bold tabular-nums" style={{ color: "#000000", borderColor: "#0090c8" }}>
              {(grandTotal + (addingColumn ? Object.values(newQuantities).reduce((s, v) => s + v, 0) : 0)) > 0
                ? (grandTotal + (addingColumn ? Object.values(newQuantities).reduce((s, v) => s + v, 0) : 0)).toLocaleString()
                : ""}
            </td>
          </tr>
        </tbody>

        {/* Actions */}
        <tfoot>
          {sortedEntries.length > 0 && (
            <tr style={{ background: "#e5f6fd" }}>
              <td className="border px-3 py-1.5 text-xs font-medium" style={{ borderColor: "#8cd7f0", color: "#1a3a6e" }}>
                Acciones
              </td>
              {sortedEntries.map((entry) => (
                <td
                  key={entry.id}
                  className="border px-1 py-1.5 text-center"
                  style={{ borderColor: "#8cd7f0" }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => onDeleteEntry(entry.id)}
                    title={`Eliminar ${type === "acta" ? "acta" : "guia"}`}
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </td>
              ))}
              {addingColumn && <td className="border" style={{ borderColor: "#8cd7f0" }} />}
              <td className="border" style={{ borderColor: "#8cd7f0" }} />
            </tr>
          )}
          {/* Add column / row buttons */}
          <tr style={{ background: "#e5f6fd" }}>
            <td colSpan={totalCols} className="border px-3 py-2" style={{ borderColor: "#8cd7f0" }}>
              <div className="flex items-center gap-2 flex-wrap">
                {!addingColumn ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setAddingColumn(true)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {type === "acta" ? "Agregar Acta" : "Agregar Guia"}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={commitNewColumn}
                      disabled={!newDate}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Confirmar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => {
                        setAddingColumn(false)
                        setNewDate("")
                        setNewNumber("")
                        setNewQuantities({})
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
                {!addingRow && availableGarmentTypes.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setAddingRow(true)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Agregar Prenda
                  </Button>
                )}
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
