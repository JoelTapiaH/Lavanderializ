export type OrderStatus = "recibido" | "lavando" | "listo" | "entregado"

export interface Group {
  id: string
  name: string
  description: string
  createdAt: string
}

export interface Worker {
  id: string
  name: string
  dni: string
  groupId: string
  createdAt: string
}

export interface GarmentType {
  id: string
  name: string
  pricePerUnit: number
  active: boolean   // false = eliminado, ya no aparece en nuevas valorizaciones
  createdAt: string
}

export interface OrderItem {
  id: string
  orderId: string
  garmentTypeId: string
  quantity: number
  observations: string
}

export interface Order {
  id: string
  workerId: string
  groupId: string
  createdAt: string
  status: OrderStatus
  notes: string
  deliveredAt: string | null
  items: OrderItem[]
}

export interface ValorizacionItem {
  garmentTypeId: string
  quantity: number
}

export interface Acta {
  id: string
  number: string
  date: string
  items: ValorizacionItem[]
}

export interface Guia {
  id: string
  number: string
  date: string
  items: ValorizacionItem[]
}

export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
}

export interface ProjectGarmentPrice {
  id: string
  projectId: string
  garmentTypeId: string
  pricePerUnit: number
}

export interface ValorizacionPeriod {
  id: string
  projectId: string | null
  name: string
  startDate: string
  endDate: string
  actas: Acta[]
  guias: Guia[]
  createdAt: string
}

export interface InventoryItem {
  id: string
  code: string        // código del ítem, ej: "BLS-G"
  name: string
  unit: string        // "und", "kg", "lt", "cil", "bolsa", etc.
  quantity: number    // stock actual
  minStock: number    // stock mínimo — alerta cuando quantity < minStock
  cost: number        // costo unitario (S/)
  notes: string
  createdAt: string
  updatedAt: string
}

export interface InventoryMovement {
  id: string
  itemId: string
  type: "entrada" | "salida"
  quantity: number
  notes: string
  createdAt: string
}

export interface Employee {
  id: string
  nombre: string
  cargo: string
  salarioBase: number
  fechaIngreso: string
  estado: "activo" | "inactivo"
  afpPct: number       // % AFP o ONP (ej: 13). Se aplica automáticamente en planilla
  descFijo: number     // S/ descuento fijo mensual (adelantos permanentes, otros)
  createdAt: string
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  fecha: string   // YYYY-MM-DD — un registro = un día asistido
  createdAt: string
}

export interface PayrollRecord {
  id: string
  periodId: string
  employeeId: string
  salarioBase: number
  fechaInicioAsistencia: string  // YYYY-MM-DD — inicio del rango de asistencia del empleado
  fechaFinAsistencia: string     // YYYY-MM-DD — fin del rango de asistencia del empleado
  diasTrabajados: number         // calculado automáticamente del rango de fechas
  diasTotalesPeriodo: number     // total de días del período (denominador del cálculo proporcional)
  horasExtra: number
  valorHoraExtra: number
  bonificaciones: number
  descuentoAfp: number      // percentage, e.g. 13
  descuentoSeguro: number   // fixed amount
  adelantos: number         // fixed amount
  otrosDescuentos: number   // fixed amount
  netoAPagar: number
  pagado: boolean           // true = payment has been made to the employee
}

export interface PayrollPeriod {
  id: string
  nombre: string
  startDate: string
  endDate: string
  tipo: "quincenal" | "mensual"
  estado: "abierto" | "cerrado"
  records: PayrollRecord[]
  createdAt: string
}

export interface StoreData {
  groups: Group[]
  workers: Worker[]
  garmentTypes: GarmentType[]
  orders: Order[]
  projects: Project[]
  projectGarmentPrices: ProjectGarmentPrice[]
  valorizaciones: ValorizacionPeriod[]
  inventoryItems: InventoryItem[]
  inventoryMovements: InventoryMovement[]
  employees: Employee[]
  attendanceRecords: AttendanceRecord[]
  payrollPeriods: PayrollPeriod[]
}

// kept for backwards compat — not used after inventory redesign
export type InventoryCategory = string
