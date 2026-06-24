"use client"

import { useState, useMemo } from "react"
import { useStore } from "@/lib/store"
import { useAuth, canEditModule } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Pencil, Users, Building2, ChevronRight, Settings2 } from "lucide-react"
import { toast } from "sonner"

export function EppTab() {
  const { profile } = useAuth()
  const canEdit = canEditModule(profile?.role ?? "operador", "valorizacion")
  const {
    data,
    addSubcontrata, updateSubcontrata, deleteSubcontrata,
    addSubcontrataWorker, updateSubcontrataWorker, deleteSubcontrataWorker,
    addEppPeriodo, updateEppPeriodoGarments, deleteEppPeriodo,
    upsertEppRegistroItem,
  } = useStore()

  const allActiveGarmentTypes = useMemo(
    () => data.garmentTypes.filter((gt) => gt.active),
    [data.garmentTypes]
  )

  // ── Period state ──────────────────────────────────────────────────────────────
  const [selectedProjectId, setSelectedProjectId] = useState<string>(data.projects[0]?.id ?? "")
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string>(data.eppPeriodos[0]?.id ?? "")
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false)
  const [periodoForm, setPeriodoForm] = useState({ nombre: "", fecha: "" })
  const [periodoGarments, setPeriodoGarments] = useState<string[]>([])
  const [garmentsDialogOpen, setGarmentsDialogOpen] = useState(false)
  const [editingGarmentsPeriodoId, setEditingGarmentsPeriodoId] = useState<string | null>(null)
  const [editingGarments, setEditingGarments] = useState<string[]>([])

  // ── View state ────────────────────────────────────────────────────────────────
  const [view, setView] = useState<"summary" | "detail">("summary")
  const [selectedSubcontrataId, setSelectedSubcontrataId] = useState<string>(
    data.subcontratas[0]?.id ?? ""
  )

  // ── Manage subcontratas dialog ─────────────────────────────────────────────
  const [manageOpen, setManageOpen] = useState(false)
  const [subcontrataForm, setSubcontrataForm] = useState("")
  const [editSubcontrataId, setEditSubcontrataId] = useState<string | null>(null)
  const [manageSubcontrataId, setManageSubcontrataId] = useState<string>(
    data.subcontratas[0]?.id ?? ""
  )
  const [workerForm, setWorkerForm] = useState("")
  const [editWorkerId, setEditWorkerId] = useState<string | null>(null)

  // ── Inline cell editing ───────────────────────────────────────────────────
  const [editingCell, setEditingCell] = useState<{ workerId: string; garmentTypeId: string } | null>(null)
  const [editingValue, setEditingValue] = useState("")

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredPeriodos = useMemo(
    () =>
      selectedProjectId
        ? data.eppPeriodos.filter((p) => p.projectId === selectedProjectId)
        : data.eppPeriodos,
    [data.eppPeriodos, selectedProjectId]
  )

  const selectedPeriodo = data.eppPeriodos.find((p) => p.id === selectedPeriodoId)

  const activeGarmentTypes = useMemo(() => {
    if (!selectedPeriodo || selectedPeriodo.garmentTypeIds.length === 0)
      return allActiveGarmentTypes
    return allActiveGarmentTypes.filter((gt) => selectedPeriodo.garmentTypeIds.includes(gt.id))
  }, [selectedPeriodo, allActiveGarmentTypes])

  const periodItems = useMemo(
    () => data.eppRegistroItems.filter((i) => i.periodoId === selectedPeriodoId),
    [data.eppRegistroItems, selectedPeriodoId]
  )

  const detailWorkers = useMemo(
    () => data.subcontrataWorkers.filter((w) => w.subcontrataId === selectedSubcontrataId),
    [data.subcontrataWorkers, selectedSubcontrataId]
  )

  const manageWorkers = useMemo(
    () => data.subcontrataWorkers.filter((w) => w.subcontrataId === manageSubcontrataId),
    [data.subcontrataWorkers, manageSubcontrataId]
  )

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getItemQty(subcontrataId: string, workerId: string, garmentTypeId: string): number {
    return (
      periodItems.find(
        (i) =>
          i.subcontrataId === subcontrataId &&
          i.workerId === workerId &&
          i.garmentTypeId === garmentTypeId
      )?.cantidad ?? 0
    )
  }

  function getSubcontrataTotal(subcontrataId: string, garmentTypeId: string): number {
    return periodItems
      .filter((i) => i.subcontrataId === subcontrataId && i.garmentTypeId === garmentTypeId)
      .reduce((sum, i) => sum + i.cantidad, 0)
  }

  function getGrandTotal(garmentTypeId: string): number {
    return periodItems
      .filter((i) => i.garmentTypeId === garmentTypeId)
      .reduce((sum, i) => sum + i.cantidad, 0)
  }

  function getSubcontrataUsuarios(subcontrataId: string): number {
    const workers = data.subcontrataWorkers.filter((w) => w.subcontrataId === subcontrataId)
    return workers.filter((w) =>
      activeGarmentTypes.some((gt) => getItemQty(subcontrataId, w.id, gt.id) > 0)
    ).length
  }

  function getTotalUsuarios(): number {
    return data.subcontratas.reduce((sum, s) => sum + getSubcontrataUsuarios(s.id), 0)
  }

  // ── Cell edit handlers ────────────────────────────────────────────────────
  async function commitCell(workerId: string, subcontrataId: string, garmentTypeId: string) {
    const qty = parseInt(editingValue, 10)
    if (!isNaN(qty) && qty >= 0) {
      await upsertEppRegistroItem(selectedPeriodoId, subcontrataId, workerId, garmentTypeId, qty)
    }
    setEditingCell(null)
    setEditingValue("")
  }

  // ── Period handlers ───────────────────────────────────────────────────────
  async function handleCreatePeriodo() {
    if (!periodoForm.nombre.trim() || !periodoForm.fecha) {
      toast.error("Completa nombre y fecha")
      return
    }
    const p = await addEppPeriodo(
      periodoForm.nombre.trim(),
      periodoForm.fecha,
      selectedProjectId || null,
      periodoGarments
    )
    setSelectedPeriodoId(p.id)
    setPeriodoForm({ nombre: "", fecha: "" })
    setPeriodoGarments([])
    setPeriodDialogOpen(false)
    toast.success("Periodo EPP creado")
  }

  async function handleSaveGarments() {
    if (!editingGarmentsPeriodoId) return
    await updateEppPeriodoGarments(editingGarmentsPeriodoId, editingGarments)
    setGarmentsDialogOpen(false)
    toast.success("Prendas actualizadas")
  }

  function toggleGarment(id: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(id) ? list.filter((g) => g !== id) : [...list, id])
  }

  // ── Subcontrata handlers ──────────────────────────────────────────────────
  async function handleSaveSubcontrata() {
    if (!subcontrataForm.trim()) return
    if (editSubcontrataId) {
      await updateSubcontrata(editSubcontrataId, subcontrataForm.trim())
      setEditSubcontrataId(null)
    } else {
      const s = await addSubcontrata(subcontrataForm.trim())
      setManageSubcontrataId(s.id)
      if (!selectedSubcontrataId) setSelectedSubcontrataId(s.id)
    }
    setSubcontrataForm("")
    toast.success("Empresa guardada")
  }

  async function handleDeleteSubcontrata(id: string) {
    await deleteSubcontrata(id)
    if (manageSubcontrataId === id) {
      setManageSubcontrataId(data.subcontratas.find((s) => s.id !== id)?.id ?? "")
    }
    toast.success("Empresa eliminada")
  }

  // ── Worker handlers ───────────────────────────────────────────────────────
  async function handleSaveWorker() {
    if (!workerForm.trim() || !manageSubcontrataId) return
    if (editWorkerId) {
      await updateSubcontrataWorker(editWorkerId, workerForm.trim())
      setEditWorkerId(null)
    } else {
      await addSubcontrataWorker(manageSubcontrataId, workerForm.trim())
    }
    setWorkerForm("")
    toast.success("Trabajador guardado")
  }

  // ── Colors (matching the Excel) ───────────────────────────────────────────
  const headerBg = "#70ad47"
  const headerBorder = "#548235"
  const rowEven = "#e2efda"
  const rowOdd = "#ffffff"
  const cellBorder = "#a9d18e"
  const footerBg = "#9dc3e6"
  const footerBorder = "#2e75b6"

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {data.projects.length > 0 && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select
                  value={selectedProjectId}
                  onValueChange={(v) => {
                    setSelectedProjectId(v)
                    const first = data.eppPeriodos.find((p) => p.projectId === v)
                    setSelectedPeriodoId(first?.id ?? "")
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">Periodo:</Label>
              {filteredPeriodos.length > 0 ? (
                <Select value={selectedPeriodoId} onValueChange={setSelectedPeriodoId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecciona periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPeriodos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">No hay periodos.</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
                  <Users className="mr-1 h-3.5 w-3.5" />
                  Empresas
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setPeriodoForm({ nombre: "", fecha: "" })
                    setPeriodDialogOpen(true)
                  }}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Nuevo Periodo
                </Button>
                {selectedPeriodo && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingGarmentsPeriodoId(selectedPeriodoId)
                        setEditingGarments(selectedPeriodo?.garmentTypeIds ?? [])
                        setGarmentsDialogOpen(true)
                      }}
                    >
                      <Settings2 className="mr-1 h-3.5 w-3.5" />
                      Prendas
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={async () => {
                        await deleteEppPeriodo(selectedPeriodoId)
                        setSelectedPeriodoId(
                          data.eppPeriodos.find((p) => p.id !== selectedPeriodoId)?.id ?? ""
                        )
                        toast.success("Periodo eliminado")
                      }}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedPeriodo ? (
        <>
          {/* Title bar */}
          <div
            className="rounded-lg px-4 py-3 text-center"
            style={{ background: "#ffd966", border: "2px solid #e6b800" }}
          >
            <h2 className="text-sm font-bold uppercase tracking-wide text-black">
              Ropa de Trabajo — Personal Fijo {selectedPeriodo.nombre}
            </h2>
            {selectedProjectId && (
              <p className="text-xs font-semibold text-black">
                {data.projects.find((p) => p.id === selectedProjectId)?.name}
              </p>
            )}
          </div>

          {/* View toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={view === "summary" ? "default" : "outline"}
              onClick={() => setView("summary")}
            >
              Resumen
            </Button>
            <Button
              size="sm"
              variant={view === "detail" ? "default" : "outline"}
              onClick={() => setView("detail")}
            >
              Detalle
            </Button>
            {view === "detail" && data.subcontratas.length > 0 && (
              <Select value={selectedSubcontrataId} onValueChange={setSelectedSubcontrataId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecciona empresa" />
                </SelectTrigger>
                <SelectContent>
                  {data.subcontratas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {data.subcontratas.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No hay empresas registradas.{" "}
              {canEdit && (
                <button
                  className="underline"
                  onClick={() => setManageOpen(true)}
                >
                  Agregar empresa
                </button>
              )}
            </div>
          ) : view === "summary" ? (
            /* RESUMEN */
            <div className="overflow-x-auto rounded-lg" style={{ border: `2px solid ${headerBorder}` }}>
              <table className="border-collapse w-full text-sm">
                <thead>
                  <tr style={{ background: headerBg }}>
                    <th
                      className="border px-3 py-2 text-center text-xs font-bold text-white"
                      style={{ borderColor: headerBorder }}
                    >
                      ITEM
                    </th>
                    <th
                      className="border px-3 py-2 text-left text-xs font-bold text-white"
                      style={{ borderColor: headerBorder }}
                    >
                      EMPRESAS
                    </th>
                    <th
                      className="border px-3 py-2 text-center text-xs font-bold text-white"
                      style={{
                        borderColor: headerBorder,
                        writingMode: "vertical-lr",
                        minWidth: 36,
                        color: "#ffcccc",
                      }}
                    >
                      USUARIOS
                    </th>
                    {activeGarmentTypes.map((gt) => (
                      <th
                        key={gt.id}
                        className="border px-3 py-2 text-center text-xs font-bold text-white"
                        style={{
                          borderColor: headerBorder,
                          writingMode: "vertical-lr",
                          minWidth: 44,
                        }}
                      >
                        {gt.name.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.subcontratas.map((s, idx) => {
                    const usuarios = getSubcontrataUsuarios(s.id)
                    return (
                      <tr key={s.id} style={{ background: idx % 2 === 0 ? rowEven : rowOdd }}>
                        <td
                          className="border px-3 py-1.5 text-center text-xs font-medium"
                          style={{ borderColor: cellBorder }}
                        >
                          {idx + 1}
                        </td>
                        <td
                          className="border px-3 py-1.5 text-xs font-semibold uppercase"
                          style={{ borderColor: cellBorder }}
                        >
                          {s.nombre}
                        </td>
                        <td
                          className={`border px-3 py-1.5 text-center text-xs font-bold tabular-nums ${usuarios > 0 ? "text-red-600" : "text-muted-foreground"}`}
                          style={{ borderColor: cellBorder }}
                        >
                          {usuarios > 0 ? usuarios : ""}
                        </td>
                        {activeGarmentTypes.map((gt) => {
                          const total = getSubcontrataTotal(s.id, gt.id)
                          return (
                            <td
                              key={gt.id}
                              className="border px-3 py-1.5 text-center text-xs tabular-nums"
                              style={{ borderColor: cellBorder }}
                            >
                              {total > 0 ? total : ""}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: footerBg }}>
                    <td
                      colSpan={2}
                      className="border px-3 py-2 text-xs font-bold uppercase"
                      style={{ borderColor: footerBorder }}
                    >
                      TOTAL
                    </td>
                    <td
                      className="border px-3 py-2 text-center text-xs font-bold tabular-nums text-red-700"
                      style={{ borderColor: footerBorder }}
                    >
                      {getTotalUsuarios() > 0 ? getTotalUsuarios() : ""}
                    </td>
                    {activeGarmentTypes.map((gt) => {
                      const total = getGrandTotal(gt.id)
                      return (
                        <td
                          key={gt.id}
                          className="border px-3 py-2 text-center text-xs font-bold tabular-nums"
                          style={{ borderColor: footerBorder }}
                        >
                          {total > 0 ? total : ""}
                        </td>
                      )
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            /* DETALLE */
            selectedSubcontrataId ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                  {data.subcontratas.find((s) => s.id === selectedSubcontrataId)?.nombre}
                </h3>
                {detailWorkers.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No hay trabajadores en esta empresa.{" "}
                    {canEdit && (
                      <button className="underline" onClick={() => { setManageSubcontrataId(selectedSubcontrataId); setManageOpen(true) }}>
                        Agregar trabajadores
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className="overflow-x-auto rounded-lg"
                    style={{ border: `2px solid ${headerBorder}` }}
                  >
                    <table className="border-collapse w-full text-sm">
                      <thead>
                        <tr style={{ background: headerBg }}>
                          <th
                            className="border px-3 py-2 text-center text-xs font-bold text-white"
                            style={{ borderColor: headerBorder }}
                          >
                            ITEM
                          </th>
                          <th
                            className="border px-3 py-2 text-left text-xs font-bold text-white"
                            style={{ borderColor: headerBorder }}
                          >
                            NOMBRES
                          </th>
                          {activeGarmentTypes.map((gt) => (
                            <th
                              key={gt.id}
                              className="border px-3 py-2 text-center text-xs font-bold text-white"
                              style={{
                                borderColor: headerBorder,
                                writingMode: "vertical-lr",
                                minWidth: 44,
                              }}
                            >
                              {gt.name.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detailWorkers.map((w, idx) => (
                          <tr
                            key={w.id}
                            style={{ background: idx % 2 === 0 ? rowEven : rowOdd }}
                          >
                            <td
                              className="border px-3 py-1.5 text-center text-xs"
                              style={{ borderColor: cellBorder }}
                            >
                              {idx + 1}
                            </td>
                            <td
                              className="border px-3 py-1.5 text-xs font-medium uppercase"
                              style={{ borderColor: cellBorder }}
                            >
                              {w.nombre}
                            </td>
                            {activeGarmentTypes.map((gt) => {
                              const isEditing =
                                editingCell?.workerId === w.id &&
                                editingCell?.garmentTypeId === gt.id
                              const qty = getItemQty(selectedSubcontrataId, w.id, gt.id)
                              return (
                                <td
                                  key={gt.id}
                                  className="border p-0 text-center text-xs tabular-nums"
                                  style={{
                                    borderColor: cellBorder,
                                    cursor: canEdit ? "pointer" : "default",
                                    background: isEditing ? "#dbeafe" : undefined,
                                  }}
                                  onClick={() => {
                                    if (!canEdit) return
                                    setEditingCell({ workerId: w.id, garmentTypeId: gt.id })
                                    setEditingValue(qty > 0 ? String(qty) : "")
                                  }}
                                >
                                  {isEditing ? (
                                    <input
                                      autoFocus
                                      type="number"
                                      min="0"
                                      className="w-full text-center text-xs bg-blue-50 border-0 outline-none p-1.5 tabular-nums"
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      onBlur={() =>
                                        commitCell(w.id, selectedSubcontrataId, gt.id)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                          commitCell(w.id, selectedSubcontrataId, gt.id)
                                        if (e.key === "Escape") {
                                          setEditingCell(null)
                                          setEditingValue("")
                                        }
                                      }}
                                    />
                                  ) : (
                                    <span className="block px-3 py-1.5">
                                      {qty > 0 ? qty : ""}
                                    </span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: footerBg }}>
                          <td
                            colSpan={2}
                            className="border px-3 py-2 text-xs font-bold uppercase"
                            style={{ borderColor: footerBorder }}
                          >
                            TOTALES
                          </td>
                          {activeGarmentTypes.map((gt) => {
                            const total = getSubcontrataTotal(selectedSubcontrataId, gt.id)
                            return (
                              <td
                                key={gt.id}
                                className="border px-3 py-2 text-center text-xs font-bold tabular-nums"
                                style={{ borderColor: footerBorder }}
                              >
                                {total > 0 ? total : ""}
                              </td>
                            )
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecciona una empresa para ver el detalle.
              </p>
            )
          )}
        </>
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Crea un periodo EPP para empezar.
        </div>
      )}

      {/* ── Nuevo Periodo Dialog ─────────────────────────────────────────────── */}
      <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Periodo EPP</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nombre</Label>
              <Input
                placeholder="Ej: 16-06-26"
                value={periodoForm.nombre}
                onChange={(e) => setPeriodoForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={periodoForm.fecha}
                onChange={(e) => setPeriodoForm((f) => ({ ...f, fecha: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Prendas a mostrar (opcional — si no seleccionas, se muestran todas)</Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto rounded-md border p-3">
                {allActiveGarmentTypes.map((gt) => (
                  <div key={gt.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`new-gt-${gt.id}`}
                      checked={periodoGarments.includes(gt.id)}
                      onCheckedChange={() => toggleGarment(gt.id, periodoGarments, setPeriodoGarments)}
                    />
                    <label htmlFor={`new-gt-${gt.id}`} className="text-sm cursor-pointer">
                      {gt.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePeriodo}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Editar Prendas Dialog ────────────────────────────────────────────── */}
      <Dialog open={garmentsDialogOpen} onOpenChange={setGarmentsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Prendas del Periodo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Selecciona las prendas que aparecen como columnas en este periodo.
              Si no seleccionas ninguna, se muestran todas.
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto rounded-md border p-3">
              {allActiveGarmentTypes.map((gt) => (
                <div key={gt.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-gt-${gt.id}`}
                    checked={editingGarments.includes(gt.id)}
                    onCheckedChange={() => toggleGarment(gt.id, editingGarments, setEditingGarments)}
                  />
                  <label htmlFor={`edit-gt-${gt.id}`} className="text-sm cursor-pointer">
                    {gt.name}
                  </label>
                </div>
              ))}
            </div>
            {editingGarments.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                Sin selección = se muestran todas las prendas activas.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGarmentsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveGarments}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Gestionar Empresas Dialog ────────────────────────────────────────── */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gestionar Empresas y Trabajadores</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Left: empresas */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                Empresas
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre empresa"
                  value={subcontrataForm}
                  onChange={(e) => setSubcontrataForm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveSubcontrata()}
                />
                <Button size="sm" onClick={handleSaveSubcontrata}>
                  {editSubcontrataId ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </Button>
                {editSubcontrataId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditSubcontrataId(null); setSubcontrataForm("") }}
                  >
                    ✕
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                {data.subcontratas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin empresas aún.</p>
                ) : (
                  data.subcontratas.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer transition-colors ${manageSubcontrataId === s.id ? "bg-accent" : "hover:bg-muted"}`}
                      onClick={() => setManageSubcontrataId(s.id)}
                    >
                      <span className="font-medium truncate">{s.nombre}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditSubcontrataId(s.id)
                            setSubcontrataForm(s.nombre)
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSubcontrata(s.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: trabajadores */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                Trabajadores{manageSubcontrataId
                  ? ` — ${data.subcontratas.find((s) => s.id === manageSubcontrataId)?.nombre ?? ""}`
                  : ""}
              </p>
              {manageSubcontrataId ? (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre trabajador"
                      value={workerForm}
                      onChange={(e) => setWorkerForm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveWorker()}
                    />
                    <Button size="sm" onClick={handleSaveWorker}>
                      {editWorkerId ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </Button>
                    {editWorkerId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditWorkerId(null); setWorkerForm("") }}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                    {manageWorkers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin trabajadores aún.</p>
                    ) : (
                      manageWorkers.map((w, idx) => (
                        <div
                          key={w.id}
                          className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
                        >
                          <span className="text-xs text-muted-foreground mr-2">{idx + 1}.</span>
                          <span className="font-medium uppercase truncate flex-1">{w.nombre}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => {
                                setEditWorkerId(w.id)
                                setWorkerForm(w.nombre)
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={async () => {
                                await deleteSubcontrataWorker(w.id)
                                toast.success("Trabajador eliminado")
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Selecciona una empresa para gestionar sus trabajadores.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setManageOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
