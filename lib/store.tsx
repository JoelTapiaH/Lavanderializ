"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { StoreData, Group, Worker, GarmentType, Order, OrderItem, OrderStatus, ValorizacionPeriod, Acta, Guia, ValorizacionItem, InventoryItem, InventoryMovement, Project, ProjectGarmentPrice, Employee, AttendanceRecord, PayrollPeriod, PayrollRecord } from "./types"
import { supabase } from "./supabase"

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}


function calcPayrollNeto(r: Omit<PayrollRecord, "id" | "periodId" | "netoAPagar">): number {
  const totalDias = r.diasTotalesPeriodo > 0 ? r.diasTotalesPeriodo : 30
  const bruto = (r.salarioBase / totalDias) * r.diasTrabajados + r.horasExtra * r.valorHoraExtra + r.bonificaciones
  const descAfp = bruto * (r.descuentoAfp / 100)
  return Math.max(0, bruto - (descAfp + r.descuentoSeguro + r.adelantos + r.otrosDescuentos))
}

const emptyData: StoreData = {
  groups: [],
  workers: [],
  garmentTypes: [],
  orders: [],
  projects: [],
  projectGarmentPrices: [],
  valorizaciones: [],
  inventoryItems: [],
  inventoryMovements: [],
  employees: [],
  attendanceRecords: [],
  payrollPeriods: [],
}

async function fetchAllData(): Promise<StoreData> {
  const [
    { data: groups },
    { data: workers },
    { data: garmentTypes },
    { data: orders },
    { data: orderItems },
    { data: valorizaciones },
    { data: actas },
    { data: actaItems },
    { data: guias },
    { data: guiaItems },
    { data: inventoryItemsRaw },
    { data: inventoryMovementsRaw },
    { data: projectsRaw },
    { data: projectGarmentPricesRaw },
    { data: employeesRaw },
    { data: attendanceRaw },
    { data: payrollPeriodsRaw },
    { data: payrollRecordsRaw },
  ] = await Promise.all([
    supabase.from("groups").select("*").order("created_at"),
    supabase.from("workers").select("*").order("created_at"),
    supabase.from("garment_types").select("*").order("created_at"),
    supabase.from("orders").select("*").order("created_at", { ascending: false }),
    supabase.from("order_items").select("*"),
    supabase.from("valorizacion_periods").select("*").order("created_at"),
    supabase.from("actas").select("*"),
    supabase.from("acta_items").select("*"),
    supabase.from("guias").select("*"),
    supabase.from("guia_items").select("*"),
    supabase.from("inventory_items").select("*").order("created_at"),
    supabase.from("inventory_movements").select("*").order("created_at", { ascending: false }),
    supabase.from("projects").select("*").order("created_at"),
    supabase.from("project_garment_prices").select("*"),
    supabase.from("employees").select("*").order("created_at"),
    supabase.from("attendance_records").select("*").order("fecha", { ascending: false }),
    supabase.from("payroll_periods").select("*").order("created_at", { ascending: false }),
    supabase.from("payroll_records").select("*"),
  ])

  const mappedOrders: Order[] = (orders ?? []).map((o) => ({
    id: o.id,
    workerId: o.worker_id,
    groupId: o.group_id,
    createdAt: o.created_at,
    status: o.status as OrderStatus,
    notes: o.notes,
    deliveredAt: o.delivered_at,
    items: (orderItems ?? [])
      .filter((i) => i.order_id === o.id)
      .map((i) => ({
        id: i.id,
        orderId: i.order_id,
        garmentTypeId: i.garment_type_id,
        quantity: i.quantity,
        observations: i.observations,
      })),
  }))

  const mappedValorizaciones: ValorizacionPeriod[] = (valorizaciones ?? []).map((v) => ({
    id: v.id,
    projectId: v.project_id ?? null,
    name: v.name,
    startDate: v.start_date,
    endDate: v.end_date,
    createdAt: v.created_at,
    actas: (actas ?? [])
      .filter((a) => a.valorizacion_id === v.id)
      .map((a) => ({
        id: a.id,
        number: a.number,
        date: a.date,
        items: (actaItems ?? [])
          .filter((ai) => ai.acta_id === a.id)
          .map((ai) => ({ garmentTypeId: ai.garment_type_id, quantity: ai.quantity })),
      })),
    guias: (guias ?? [])
      .filter((g) => g.valorizacion_id === v.id)
      .map((g) => ({
        id: g.id,
        number: g.number,
        date: g.date,
        items: (guiaItems ?? [])
          .filter((gi) => gi.guia_id === g.id)
          .map((gi) => ({ garmentTypeId: gi.garment_type_id, quantity: gi.quantity })),
      })),
  }))

  const mappedPayrollRecords = (payrollRecordsRaw ?? []).map((r) => ({
    id: r.id, periodId: r.period_id, employeeId: r.employee_id,
    salarioBase: r.salario_base,
    fechaInicioAsistencia: r.fecha_inicio_asistencia ?? "",
    fechaFinAsistencia: r.fecha_fin_asistencia ?? "",
    diasTrabajados: r.dias_trabajados,
    diasTotalesPeriodo: r.dias_totales_periodo ?? 30,
    horasExtra: r.horas_extra, valorHoraExtra: r.valor_hora_extra,
    bonificaciones: r.bonificaciones, descuentoAfp: r.descuento_afp,
    descuentoSeguro: r.descuento_seguro, adelantos: r.adelantos,
    otrosDescuentos: r.otros_descuentos, netoAPagar: r.neto_a_pagar,
    pagado: r.pagado ?? false,
  }))

  return {
    groups: (groups ?? []).map((g) => ({ id: g.id, name: g.name, description: g.description, createdAt: g.created_at })),
    workers: (workers ?? []).map((w) => ({ id: w.id, name: w.name, dni: w.dni, groupId: w.group_id, createdAt: w.created_at })),
    garmentTypes: (garmentTypes ?? []).map((gt) => ({ id: gt.id, name: gt.name, pricePerUnit: gt.price_per_unit, active: gt.active ?? true, createdAt: gt.created_at })),
    orders: mappedOrders,
    valorizaciones: mappedValorizaciones,
    inventoryItems: (inventoryItemsRaw ?? []).map((i) => ({
      id: i.id, code: i.code ?? "", name: i.name,
      unit: i.unit, quantity: i.quantity, minStock: i.min_stock,
      cost: i.cost, notes: i.notes, createdAt: i.created_at, updatedAt: i.updated_at,
    })),
    inventoryMovements: (inventoryMovementsRaw ?? []).map((m) => ({
      id: m.id, itemId: m.item_id, type: m.type as "entrada" | "salida",
      quantity: m.quantity, notes: m.notes, createdAt: m.created_at,
    })),
    projects: (projectsRaw ?? []).map((p) => ({
      id: p.id, name: p.name, description: p.description, createdAt: p.created_at,
    })),
    projectGarmentPrices: (projectGarmentPricesRaw ?? []).map((p) => ({
      id: p.id, projectId: p.project_id, garmentTypeId: p.garment_type_id, pricePerUnit: p.price_per_unit,
    })),
    employees: (employeesRaw ?? []).map((e) => ({
      id: e.id, nombre: e.nombre, cargo: e.cargo,
      salarioBase: e.salario_base, fechaIngreso: e.fecha_ingreso ?? "",
      estado: e.estado as "activo" | "inactivo",
      afpPct: e.afp_pct ?? 13, descFijo: e.desc_fijo ?? 0,
      createdAt: e.created_at,
    })),
    attendanceRecords: (attendanceRaw ?? []).map((a) => ({
      id: a.id, employeeId: a.employee_id, fecha: a.fecha, createdAt: a.created_at,
    })),
    payrollPeriods: (payrollPeriodsRaw ?? []).map((p) => ({
      id: p.id, nombre: p.nombre, startDate: p.start_date, endDate: p.end_date,
      tipo: p.tipo as "quincenal" | "mensual",
      estado: p.estado as "abierto" | "cerrado",
      createdAt: p.created_at,
      records: mappedPayrollRecords.filter((r) => r.periodId === p.id),
    })),
  }
}

interface StoreContextType {
  data: StoreData
  loading: boolean
  // Groups
  addGroup: (name: string, description: string) => Promise<Group>
  updateGroup: (id: string, name: string, description: string) => Promise<void>
  deleteGroup: (id: string) => Promise<void>
  getGroup: (id: string) => Group | undefined
  // Workers
  addWorker: (name: string, dni: string, groupId: string) => Promise<Worker>
  updateWorker: (id: string, name: string, dni: string, groupId: string) => Promise<void>
  deleteWorker: (id: string) => Promise<void>
  getWorker: (id: string) => Worker | undefined
  getWorkersByGroup: (groupId: string) => Worker[]
  // Garment Types
  addGarmentType: (name: string, pricePerUnit?: number) => Promise<GarmentType>
  updateGarmentType: (id: string, name: string, pricePerUnit?: number) => Promise<void>
  deleteGarmentType: (id: string) => Promise<void>
  eliminateGarmentType: (id: string) => Promise<void>
  reactivateGarmentType: (id: string) => Promise<void>
  getGarmentType: (id: string) => GarmentType | undefined
  // Orders
  addOrder: (workerId: string, groupId: string, notes: string, items: Omit<OrderItem, "id" | "orderId">[]) => Promise<Order>
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
  getOrder: (id: string) => Order | undefined
  getOrdersByWorker: (workerId: string) => Order[]
  getOrdersByGroup: (groupId: string) => Order[]
  getTotalItems: (order: Order) => number
  // Projects
  addProject: (name: string, description: string) => Promise<Project>
  updateProject: (id: string, name: string, description: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  getProject: (id: string) => Project | undefined
  upsertProjectGarmentPrice: (projectId: string, garmentTypeId: string, pricePerUnit: number) => Promise<void>
  // Valorizaciones
  addValorizacion: (name: string, startDate: string, endDate: string, projectId?: string | null) => Promise<ValorizacionPeriod>
  updateValorizacion: (id: string, name: string, startDate: string, endDate: string, projectId?: string | null) => Promise<void>
  deleteValorizacion: (id: string) => Promise<void>
  getValorizacion: (id: string) => ValorizacionPeriod | undefined
  addActa: (valId: string, number: string, date: string, items: ValorizacionItem[]) => Promise<void>
  updateActa: (valId: string, actaId: string, number: string, date: string, items: ValorizacionItem[]) => Promise<void>
  deleteActa: (valId: string, actaId: string) => Promise<void>
  addGuia: (valId: string, number: string, date: string, items: ValorizacionItem[]) => Promise<void>
  updateGuia: (valId: string, guiaId: string, number: string, date: string, items: ValorizacionItem[]) => Promise<void>
  deleteGuia: (valId: string, guiaId: string) => Promise<void>
  // Inventory
  addInventoryItem: (code: string, name: string, unit: string, quantity: number, minStock: number, cost: number, notes: string) => Promise<InventoryItem>
  updateInventoryItem: (id: string, code: string, name: string, unit: string, minStock: number, cost: number, notes: string) => Promise<void>
  deleteInventoryItem: (id: string) => Promise<void>
  addInventoryMovement: (itemId: string, type: "entrada" | "salida", quantity: number, notes: string) => Promise<InventoryMovement>
  // Employees
  addEmployee: (nombre: string, cargo: string, salarioBase: number, fechaIngreso: string, afpPct: number, descFijo: number) => Promise<Employee>
  updateEmployee: (id: string, nombre: string, cargo: string, salarioBase: number, fechaIngreso: string, estado: "activo" | "inactivo", afpPct: number, descFijo: number) => Promise<void>
  deleteEmployee: (id: string) => Promise<void>
  // Attendance
  addAttendanceRecord: (employeeId: string, fecha: string) => Promise<AttendanceRecord>
  updateAttendanceRecord: (id: string, fecha: string) => Promise<void>
  deleteAttendanceRecord: (id: string) => Promise<void>
  // Payroll Periods
  addPayrollPeriod: (nombre: string, startDate: string, endDate: string, tipo: "quincenal" | "mensual") => Promise<PayrollPeriod>
  deletePayrollPeriod: (id: string) => Promise<void>
  closePayrollPeriod: (id: string) => Promise<void>
  // Payroll Records
  upsertPayrollRecord: (periodId: string, record: Omit<PayrollRecord, "id" | "periodId" | "netoAPagar">) => Promise<void>
  deletePayrollRecord: (periodId: string, recordId: string) => Promise<void>
  markPayrollRecordPaid: (periodId: string, recordId: string, pagado: boolean) => Promise<void>
  // Reset
  resetData: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StoreData>(emptyData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllData().then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  // ── Groups ──────────────────────────────────────────────────────────────────

  const addGroup = useCallback(async (name: string, description: string): Promise<Group> => {
    const group: Group = { id: generateId(), name, description, createdAt: new Date().toISOString() }
    setData((prev) => ({ ...prev, groups: [...prev.groups, group] }))
    await supabase.from("groups").insert({ id: group.id, name, description, created_at: group.createdAt })
    return group
  }, [])

  const updateGroup = useCallback(async (id: string, name: string, description: string) => {
    setData((prev) => ({ ...prev, groups: prev.groups.map((g) => (g.id === id ? { ...g, name, description } : g)) }))
    await supabase.from("groups").update({ name, description }).eq("id", id)
  }, [])

  const deleteGroup = useCallback(async (id: string) => {
    setData((prev) => ({ ...prev, groups: prev.groups.filter((g) => g.id !== id) }))
    await supabase.from("groups").delete().eq("id", id)
  }, [])

  const getGroup = useCallback((id: string) => data.groups.find((g) => g.id === id), [data.groups])

  // ── Workers ─────────────────────────────────────────────────────────────────

  const addWorker = useCallback(async (name: string, dni: string, groupId: string): Promise<Worker> => {
    const worker: Worker = { id: generateId(), name, dni, groupId, createdAt: new Date().toISOString() }
    setData((prev) => ({ ...prev, workers: [...prev.workers, worker] }))
    await supabase.from("workers").insert({ id: worker.id, name, dni, group_id: groupId, created_at: worker.createdAt })
    return worker
  }, [])

  const updateWorker = useCallback(async (id: string, name: string, dni: string, groupId: string) => {
    setData((prev) => ({ ...prev, workers: prev.workers.map((w) => (w.id === id ? { ...w, name, dni, groupId } : w)) }))
    await supabase.from("workers").update({ name, dni, group_id: groupId }).eq("id", id)
  }, [])

  const deleteWorker = useCallback(async (id: string) => {
    setData((prev) => ({ ...prev, workers: prev.workers.filter((w) => w.id !== id) }))
    await supabase.from("workers").delete().eq("id", id)
  }, [])

  const getWorker = useCallback((id: string) => data.workers.find((w) => w.id === id), [data.workers])
  const getWorkersByGroup = useCallback((groupId: string) => data.workers.filter((w) => w.groupId === groupId), [data.workers])

  // ── Garment Types ────────────────────────────────────────────────────────────

  const addGarmentType = useCallback(async (name: string, pricePerUnit = 0): Promise<GarmentType> => {
    const gt: GarmentType = { id: generateId(), name, pricePerUnit, active: true, createdAt: new Date().toISOString() }
    setData((prev) => ({ ...prev, garmentTypes: [...prev.garmentTypes, gt] }))
    await supabase.from("garment_types").insert({ id: gt.id, name, price_per_unit: pricePerUnit, active: true, created_at: gt.createdAt })
    return gt
  }, [])

  const updateGarmentType = useCallback(async (id: string, name: string, pricePerUnit?: number) => {
    setData((prev) => ({
      ...prev,
      garmentTypes: prev.garmentTypes.map((gt) =>
        gt.id === id ? { ...gt, name, ...(pricePerUnit !== undefined ? { pricePerUnit } : {}) } : gt
      ),
    }))
    await supabase.from("garment_types").update({ name, ...(pricePerUnit !== undefined ? { price_per_unit: pricePerUnit } : {}) }).eq("id", id)
  }, [])

  const deleteGarmentType = useCallback(async (id: string) => {
    setData((prev) => ({ ...prev, garmentTypes: prev.garmentTypes.filter((gt) => gt.id !== id) }))
    await supabase.from("garment_types").delete().eq("id", id)
  }, [])

  const eliminateGarmentType = useCallback(async (id: string) => {
    setData((prev) => ({ ...prev, garmentTypes: prev.garmentTypes.map((gt) => gt.id === id ? { ...gt, active: false } : gt) }))
    await supabase.from("garment_types").update({ active: false }).eq("id", id)
  }, [])

  const reactivateGarmentType = useCallback(async (id: string) => {
    setData((prev) => ({ ...prev, garmentTypes: prev.garmentTypes.map((gt) => gt.id === id ? { ...gt, active: true } : gt) }))
    await supabase.from("garment_types").update({ active: true }).eq("id", id)
  }, [])

  const getGarmentType = useCallback((id: string) => data.garmentTypes.find((gt) => gt.id === id), [data.garmentTypes])

  // ── Orders ───────────────────────────────────────────────────────────────────

  const addOrder = useCallback(async (
    workerId: string,
    groupId: string,
    notes: string,
    items: Omit<OrderItem, "id" | "orderId">[]
  ): Promise<Order> => {
    const orderId = generateId()
    const createdAt = new Date().toISOString()
    const orderItems: OrderItem[] = items.map((item) => ({ ...item, id: generateId(), orderId }))
    const order: Order = { id: orderId, workerId, groupId, createdAt, status: "recibido", notes, deliveredAt: null, items: orderItems }

    setData((prev) => ({ ...prev, orders: [order, ...prev.orders] }))
    await supabase.from("orders").insert({ id: orderId, worker_id: workerId, group_id: groupId, status: "recibido", notes, created_at: createdAt })
    if (orderItems.length > 0) {
      await supabase.from("order_items").insert(
        orderItems.map((i) => ({ id: i.id, order_id: orderId, garment_type_id: i.garmentTypeId, quantity: i.quantity, observations: i.observations }))
      )
    }
    return order
  }, [])

  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus) => {
    const deliveredAt = status === "entregado" ? new Date().toISOString() : null
    setData((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === id ? { ...o, status, deliveredAt: deliveredAt ?? o.deliveredAt } : o
      ),
    }))
    await supabase.from("orders").update({ status, ...(status === "entregado" ? { delivered_at: deliveredAt } : {}) }).eq("id", id)
  }, [])

  const deleteOrder = useCallback(async (id: string) => {
    setData((prev) => ({ ...prev, orders: prev.orders.filter((o) => o.id !== id) }))
    await supabase.from("orders").delete().eq("id", id)
  }, [])

  const getOrder = useCallback((id: string) => data.orders.find((o) => o.id === id), [data.orders])
  const getOrdersByWorker = useCallback((workerId: string) => data.orders.filter((o) => o.workerId === workerId), [data.orders])
  const getOrdersByGroup = useCallback((groupId: string) => data.orders.filter((o) => o.groupId === groupId), [data.orders])
  const getTotalItems = useCallback((order: Order) => order.items.reduce((sum, i) => sum + i.quantity, 0), [])

  // ── Valorizaciones ───────────────────────────────────────────────────────────

  const addValorizacion = useCallback(async (name: string, startDate: string, endDate: string, projectId: string | null = null): Promise<ValorizacionPeriod> => {
    const val: ValorizacionPeriod = { id: generateId(), projectId, name, startDate, endDate, actas: [], guias: [], createdAt: new Date().toISOString() }
    setData((prev) => ({ ...prev, valorizaciones: [...prev.valorizaciones, val] }))
    await supabase.from("valorizacion_periods").insert({ id: val.id, name, start_date: startDate, end_date: endDate, project_id: projectId, created_at: val.createdAt })
    return val
  }, [])

  const updateValorizacion = useCallback(async (id: string, name: string, startDate: string, endDate: string, projectId: string | null = null) => {
    setData((prev) => ({
      ...prev,
      valorizaciones: prev.valorizaciones.map((v) => (v.id === id ? { ...v, name, startDate, endDate, projectId } : v)),
    }))
    await supabase.from("valorizacion_periods").update({ name, start_date: startDate, end_date: endDate, project_id: projectId }).eq("id", id)
  }, [])

  const deleteValorizacion = useCallback(async (id: string) => {
    setData((prev) => ({ ...prev, valorizaciones: prev.valorizaciones.filter((v) => v.id !== id) }))
    await supabase.from("valorizacion_periods").delete().eq("id", id)
  }, [])

  const getValorizacion = useCallback((id: string) => data.valorizaciones.find((v) => v.id === id), [data.valorizaciones])

  // ── Actas ────────────────────────────────────────────────────────────────────

  const addActa = useCallback(async (valId: string, number: string, date: string, items: ValorizacionItem[]) => {
    const acta: Acta = { id: generateId(), number, date, items }
    setData((prev) => ({
      ...prev,
      valorizaciones: prev.valorizaciones.map((v) => (v.id === valId ? { ...v, actas: [...v.actas, acta] } : v)),
    }))
    await supabase.from("actas").insert({ id: acta.id, valorizacion_id: valId, number, date })
    if (items.length > 0) {
      await supabase.from("acta_items").insert(
        items.map((i) => ({ id: generateId(), acta_id: acta.id, garment_type_id: i.garmentTypeId, quantity: i.quantity }))
      )
    }
  }, [])

  const updateActa = useCallback(async (valId: string, actaId: string, number: string, date: string, items: ValorizacionItem[]) => {
    setData((prev) => ({
      ...prev,
      valorizaciones: prev.valorizaciones.map((v) =>
        v.id === valId
          ? { ...v, actas: v.actas.map((a) => (a.id === actaId ? { ...a, number, date, items } : a)) }
          : v
      ),
    }))
    await supabase.from("actas").update({ number, date }).eq("id", actaId)
    await supabase.from("acta_items").delete().eq("acta_id", actaId)
    if (items.length > 0) {
      await supabase.from("acta_items").insert(
        items.map((i) => ({ id: generateId(), acta_id: actaId, garment_type_id: i.garmentTypeId, quantity: i.quantity }))
      )
    }
  }, [])

  const deleteActa = useCallback(async (valId: string, actaId: string) => {
    setData((prev) => ({
      ...prev,
      valorizaciones: prev.valorizaciones.map((v) =>
        v.id === valId ? { ...v, actas: v.actas.filter((a) => a.id !== actaId) } : v
      ),
    }))
    await supabase.from("actas").delete().eq("id", actaId)
  }, [])

  // ── Guias ────────────────────────────────────────────────────────────────────

  const addGuia = useCallback(async (valId: string, number: string, date: string, items: ValorizacionItem[]) => {
    const guia: Guia = { id: generateId(), number, date, items }
    setData((prev) => ({
      ...prev,
      valorizaciones: prev.valorizaciones.map((v) => (v.id === valId ? { ...v, guias: [...v.guias, guia] } : v)),
    }))
    await supabase.from("guias").insert({ id: guia.id, valorizacion_id: valId, number, date })
    if (items.length > 0) {
      await supabase.from("guia_items").insert(
        items.map((i) => ({ id: generateId(), guia_id: guia.id, garment_type_id: i.garmentTypeId, quantity: i.quantity }))
      )
    }
  }, [])

  const updateGuia = useCallback(async (valId: string, guiaId: string, number: string, date: string, items: ValorizacionItem[]) => {
    setData((prev) => ({
      ...prev,
      valorizaciones: prev.valorizaciones.map((v) =>
        v.id === valId
          ? { ...v, guias: v.guias.map((g) => (g.id === guiaId ? { ...g, number, date, items } : g)) }
          : v
      ),
    }))
    await supabase.from("guias").update({ number, date }).eq("id", guiaId)
    await supabase.from("guia_items").delete().eq("guia_id", guiaId)
    if (items.length > 0) {
      await supabase.from("guia_items").insert(
        items.map((i) => ({ id: generateId(), guia_id: guiaId, garment_type_id: i.garmentTypeId, quantity: i.quantity }))
      )
    }
  }, [])

  const deleteGuia = useCallback(async (valId: string, guiaId: string) => {
    setData((prev) => ({
      ...prev,
      valorizaciones: prev.valorizaciones.map((v) =>
        v.id === valId ? { ...v, guias: v.guias.filter((g) => g.id !== guiaId) } : v
      ),
    }))
    await supabase.from("guias").delete().eq("id", guiaId)
  }, [])

  // ── Projects ─────────────────────────────────────────────────────────────────

  const addProject = useCallback(async (name: string, description: string): Promise<Project> => {
    const project: Project = { id: generateId(), name, description, createdAt: new Date().toISOString() }
    setData((prev) => ({ ...prev, projects: [...prev.projects, project] }))
    await supabase.from("projects").insert({ id: project.id, name, description, created_at: project.createdAt })
    return project
  }, [])

  const updateProject = useCallback(async (id: string, name: string, description: string) => {
    setData((prev) => ({ ...prev, projects: prev.projects.map((p) => (p.id === id ? { ...p, name, description } : p)) }))
    await supabase.from("projects").update({ name, description }).eq("id", id)
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    setData((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
      projectGarmentPrices: prev.projectGarmentPrices.filter((p) => p.projectId !== id),
    }))
    await supabase.from("project_garment_prices").delete().eq("project_id", id)
    await supabase.from("projects").delete().eq("id", id)
  }, [])

  const getProject = useCallback((id: string) => data.projects.find((p) => p.id === id), [data.projects])

  const upsertProjectGarmentPrice = useCallback(async (projectId: string, garmentTypeId: string, pricePerUnit: number) => {
    const existing = data.projectGarmentPrices.find(
      (p) => p.projectId === projectId && p.garmentTypeId === garmentTypeId
    )
    if (existing) {
      setData((prev) => ({
        ...prev,
        projectGarmentPrices: prev.projectGarmentPrices.map((p) =>
          p.id === existing.id ? { ...p, pricePerUnit } : p
        ),
      }))
      await supabase.from("project_garment_prices").update({ price_per_unit: pricePerUnit }).eq("id", existing.id)
    } else {
      const newPrice: ProjectGarmentPrice = { id: generateId(), projectId, garmentTypeId, pricePerUnit }
      setData((prev) => ({ ...prev, projectGarmentPrices: [...prev.projectGarmentPrices, newPrice] }))
      await supabase.from("project_garment_prices").insert({
        id: newPrice.id, project_id: projectId, garment_type_id: garmentTypeId, price_per_unit: pricePerUnit,
      })
    }
  }, [data.projectGarmentPrices])

  // ── Inventory ────────────────────────────────────────────────────────────────

  const addInventoryItem = useCallback(async (
    code: string, name: string, unit: string,
    quantity: number, minStock: number, cost: number, notes: string
  ): Promise<InventoryItem> => {
    const now = new Date().toISOString()
    const item: InventoryItem = { id: generateId(), code, name, unit, quantity, minStock, cost, notes, createdAt: now, updatedAt: now }
    setData((prev) => ({ ...prev, inventoryItems: [...prev.inventoryItems, item] }))
    await supabase.from("inventory_items").insert({
      id: item.id, code, name, unit, quantity, min_stock: minStock, cost, notes,
      created_at: now, updated_at: now,
    })
    return item
  }, [])

  const updateInventoryItem = useCallback(async (
    id: string, code: string, name: string, unit: string,
    minStock: number, cost: number, notes: string
  ) => {
    const updatedAt = new Date().toISOString()
    setData((prev) => ({
      ...prev,
      inventoryItems: prev.inventoryItems.map((i) =>
        i.id === id ? { ...i, code, name, unit, minStock, cost, notes, updatedAt } : i
      ),
    }))
    await supabase.from("inventory_items").update({ code, name, unit, min_stock: minStock, cost, notes, updated_at: updatedAt }).eq("id", id)
  }, [])

  const deleteInventoryItem = useCallback(async (id: string) => {
    setData((prev) => ({
      ...prev,
      inventoryItems: prev.inventoryItems.filter((i) => i.id !== id),
      inventoryMovements: prev.inventoryMovements.filter((m) => m.itemId !== id),
    }))
    await supabase.from("inventory_movements").delete().eq("item_id", id)
    await supabase.from("inventory_items").delete().eq("id", id)
  }, [])

  const addInventoryMovement = useCallback(async (
    itemId: string, type: "entrada" | "salida", quantity: number, notes: string
  ): Promise<InventoryMovement> => {
    const now = new Date().toISOString()
    const movement: InventoryMovement = { id: generateId(), itemId, type, quantity, notes, createdAt: now }
    const delta = type === "entrada" ? quantity : -quantity
    let newQuantity = 0
    setData((prev) => {
      const updated = prev.inventoryItems.map((i) => {
        if (i.id !== itemId) return i
        newQuantity = i.quantity + delta
        return { ...i, quantity: newQuantity, updatedAt: now }
      })
      return { ...prev, inventoryItems: updated, inventoryMovements: [movement, ...prev.inventoryMovements] }
    })
    await supabase.from("inventory_movements").insert({
      id: movement.id, item_id: itemId, type, quantity, notes, created_at: now,
    })
    await supabase.from("inventory_items").update({ quantity: newQuantity, updated_at: now }).eq("id", itemId)
    return movement
  }, [])

  // ── Employees ────────────────────────────────────────────────────────────────

  const addEmployee = useCallback(async (nombre: string, cargo: string, salarioBase: number, fechaIngreso: string, afpPct: number, descFijo: number): Promise<Employee> => {
    const employee: Employee = { id: generateId(), nombre, cargo, salarioBase, fechaIngreso, estado: "activo", afpPct, descFijo, createdAt: new Date().toISOString() }
    setData((prev) => ({ ...prev, employees: [...prev.employees, employee] }))
    await supabase.from("employees").insert({ id: employee.id, nombre, cargo, salario_base: salarioBase, fecha_ingreso: fechaIngreso, estado: "activo", afp_pct: afpPct, desc_fijo: descFijo, created_at: employee.createdAt })
    return employee
  }, [])

  const updateEmployee = useCallback(async (id: string, nombre: string, cargo: string, salarioBase: number, fechaIngreso: string, estado: "activo" | "inactivo", afpPct: number, descFijo: number) => {
    setData((prev) => ({ ...prev, employees: prev.employees.map((e) => e.id === id ? { ...e, nombre, cargo, salarioBase, fechaIngreso, estado, afpPct, descFijo } : e) }))
    await supabase.from("employees").update({ nombre, cargo, salario_base: salarioBase, fecha_ingreso: fechaIngreso, estado, afp_pct: afpPct, desc_fijo: descFijo }).eq("id", id)
  }, [])

  const deleteEmployee = useCallback(async (id: string) => {
    setData((prev) => ({ ...prev, employees: prev.employees.filter((e) => e.id !== id) }))
    await supabase.from("employees").delete().eq("id", id)
  }, [])

  // ── Attendance ────────────────────────────────────────────────────────────────

  const addAttendanceRecord = useCallback(async (employeeId: string, fecha: string): Promise<AttendanceRecord> => {
    const record: AttendanceRecord = { id: generateId(), employeeId, fecha, createdAt: new Date().toISOString() }
    setData((prev) => ({ ...prev, attendanceRecords: [record, ...prev.attendanceRecords] }))
    await supabase.from("attendance_records").insert({ id: record.id, employee_id: employeeId, fecha, created_at: record.createdAt })
    return record
  }, [])

  const updateAttendanceRecord = useCallback(async (id: string, fecha: string) => {
    setData((prev) => ({
      ...prev,
      attendanceRecords: prev.attendanceRecords.map((a) => a.id === id ? { ...a, fecha } : a),
    }))
    await supabase.from("attendance_records").update({ fecha }).eq("id", id)
  }, [])

  const deleteAttendanceRecord = useCallback(async (id: string) => {
    setData((prev) => ({ ...prev, attendanceRecords: prev.attendanceRecords.filter((a) => a.id !== id) }))
    await supabase.from("attendance_records").delete().eq("id", id)
  }, [])

  // ── Payroll Periods ───────────────────────────────────────────────────────────

  const addPayrollPeriod = useCallback(async (nombre: string, startDate: string, endDate: string, tipo: "quincenal" | "mensual"): Promise<PayrollPeriod> => {
    const period: PayrollPeriod = { id: generateId(), nombre, startDate, endDate, tipo, estado: "abierto", records: [], createdAt: new Date().toISOString() }
    setData((prev) => ({ ...prev, payrollPeriods: [period, ...prev.payrollPeriods] }))
    await supabase.from("payroll_periods").insert({ id: period.id, nombre, start_date: startDate, end_date: endDate, tipo, estado: "abierto", created_at: period.createdAt })
    return period
  }, [])

  const deletePayrollPeriod = useCallback(async (id: string) => {
    setData((prev) => ({ ...prev, payrollPeriods: prev.payrollPeriods.filter((p) => p.id !== id) }))
    await supabase.from("payroll_records").delete().eq("period_id", id)
    await supabase.from("payroll_periods").delete().eq("id", id)
  }, [])

  const closePayrollPeriod = useCallback(async (id: string) => {
    setData((prev) => ({ ...prev, payrollPeriods: prev.payrollPeriods.map((p) => p.id === id ? { ...p, estado: "cerrado" } : p) }))
    await supabase.from("payroll_periods").update({ estado: "cerrado" }).eq("id", id)
  }, [])

  // ── Payroll Records ───────────────────────────────────────────────────────────

  const upsertPayrollRecord = useCallback(async (periodId: string, recordData: Omit<PayrollRecord, "id" | "periodId" | "netoAPagar">) => {
    const netoAPagar = calcPayrollNeto(recordData)
    const existing = data.payrollPeriods.find((p) => p.id === periodId)?.records.find((r) => r.employeeId === recordData.employeeId)
    if (existing) {
      const updated: PayrollRecord = { ...existing, ...recordData, netoAPagar }
      setData((prev) => ({
        ...prev,
        payrollPeriods: prev.payrollPeriods.map((p) =>
          p.id === periodId ? { ...p, records: p.records.map((r) => r.id === existing.id ? updated : r) } : p
        ),
      }))
      await supabase.from("payroll_records").update({
        salario_base: recordData.salarioBase,
        fecha_inicio_asistencia: recordData.fechaInicioAsistencia || null,
        fecha_fin_asistencia: recordData.fechaFinAsistencia || null,
        dias_trabajados: recordData.diasTrabajados,
        dias_totales_periodo: recordData.diasTotalesPeriodo,
        horas_extra: recordData.horasExtra, valor_hora_extra: recordData.valorHoraExtra,
        bonificaciones: recordData.bonificaciones, descuento_afp: recordData.descuentoAfp,
        descuento_seguro: recordData.descuentoSeguro, adelantos: recordData.adelantos,
        otros_descuentos: recordData.otrosDescuentos, neto_a_pagar: netoAPagar,
      }).eq("id", existing.id)
    } else {
      const id = generateId()
      const newRecord: PayrollRecord = { id, periodId, ...recordData, netoAPagar }
      setData((prev) => ({
        ...prev,
        payrollPeriods: prev.payrollPeriods.map((p) =>
          p.id === periodId ? { ...p, records: [...p.records, newRecord] } : p
        ),
      }))
      await supabase.from("payroll_records").insert({
        id, period_id: periodId, employee_id: recordData.employeeId,
        salario_base: recordData.salarioBase,
        fecha_inicio_asistencia: recordData.fechaInicioAsistencia || null,
        fecha_fin_asistencia: recordData.fechaFinAsistencia || null,
        dias_trabajados: recordData.diasTrabajados,
        dias_totales_periodo: recordData.diasTotalesPeriodo,
        horas_extra: recordData.horasExtra, valor_hora_extra: recordData.valorHoraExtra,
        bonificaciones: recordData.bonificaciones, descuento_afp: recordData.descuentoAfp,
        descuento_seguro: recordData.descuentoSeguro, adelantos: recordData.adelantos,
        otros_descuentos: recordData.otrosDescuentos, neto_a_pagar: netoAPagar,
        pagado: recordData.pagado ?? false,
      })
    }
  }, [data.payrollPeriods])

  const deletePayrollRecord = useCallback(async (periodId: string, recordId: string) => {
    setData((prev) => ({
      ...prev,
      payrollPeriods: prev.payrollPeriods.map((p) =>
        p.id === periodId ? { ...p, records: p.records.filter((r) => r.id !== recordId) } : p
      ),
    }))
    await supabase.from("payroll_records").delete().eq("id", recordId)
  }, [])

  const markPayrollRecordPaid = useCallback(async (periodId: string, recordId: string, pagado: boolean) => {
    setData((prev) => ({
      ...prev,
      payrollPeriods: prev.payrollPeriods.map((p) =>
        p.id === periodId
          ? { ...p, records: p.records.map((r) => r.id === recordId ? { ...r, pagado } : r) }
          : p
      ),
    }))
    await supabase.from("payroll_records").update({ pagado }).eq("id", recordId)
  }, [])

  // ── Reset ────────────────────────────────────────────────────────────────────

  const resetData = useCallback(async () => {
    const tables = ["guia_items", "guias", "acta_items", "actas", "valorizacion_periods", "order_items", "orders", "garment_types", "workers", "groups"]
    for (const table of tables) {
      await supabase.from(table).delete().neq("id", "___never___")
    }
    setData(emptyData)
  }, [])

  if (loading) {
    return null
  }

  return (
    <StoreContext.Provider
      value={{
        data,
        loading,
        addGroup, updateGroup, deleteGroup, getGroup,
        addWorker, updateWorker, deleteWorker, getWorker, getWorkersByGroup,
        addGarmentType, updateGarmentType, deleteGarmentType, eliminateGarmentType, reactivateGarmentType, getGarmentType,
        addOrder, updateOrderStatus, deleteOrder, getOrder, getOrdersByWorker, getOrdersByGroup, getTotalItems,
        addProject, updateProject, deleteProject, getProject, upsertProjectGarmentPrice,
        addValorizacion, updateValorizacion, deleteValorizacion, getValorizacion,
        addActa, updateActa, deleteActa,
        addGuia, updateGuia, deleteGuia,
        addInventoryItem, updateInventoryItem, deleteInventoryItem, addInventoryMovement,
        addEmployee, updateEmployee, deleteEmployee,
        addAttendanceRecord, updateAttendanceRecord, deleteAttendanceRecord,
        addPayrollPeriod, deletePayrollPeriod, closePayrollPeriod,
        upsertPayrollRecord, deletePayrollRecord, markPayrollRecordPaid,
        resetData,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error("useStore must be used within a StoreProvider")
  return context
}
