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

export interface ValorizacionPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
  actas: Acta[]
  guias: Guia[]
  createdAt: string
}

export interface StoreData {
  groups: Group[]
  workers: Worker[]
  garmentTypes: GarmentType[]
  orders: Order[]
  valorizaciones: ValorizacionPeriod[]
}
