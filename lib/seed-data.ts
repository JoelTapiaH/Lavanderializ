import type { StoreData } from "./types"

export const seedData: StoreData = {
  groups: [
    { id: "g1", name: "Cuadrilla Alpha", description: "Turno dia - Nivel 4200", createdAt: "2025-12-01T08:00:00Z" },
    { id: "g2", name: "Cuadrilla Bravo", description: "Turno noche - Nivel 4200", createdAt: "2025-12-01T08:00:00Z" },
    { id: "g3", name: "Cuadrilla Charlie", description: "Turno dia - Nivel 4500", createdAt: "2025-12-15T08:00:00Z" },
  ],
  workers: [
    { id: "w1", name: "Carlos Quispe", dni: "45678912", groupId: "g1", createdAt: "2025-12-01T08:00:00Z" },
    { id: "w2", name: "Miguel Huaman", dni: "78912345", groupId: "g1", createdAt: "2025-12-01T08:00:00Z" },
    { id: "w3", name: "Jose Mamani", dni: "12345678", groupId: "g2", createdAt: "2025-12-01T08:00:00Z" },
    { id: "w4", name: "Luis Condori", dni: "98765432", groupId: "g2", createdAt: "2025-12-02T08:00:00Z" },
    { id: "w5", name: "Pedro Ramos", dni: "56781234", groupId: "g3", createdAt: "2025-12-15T08:00:00Z" },
    { id: "w6", name: "Raul Torres", dni: "34567891", groupId: "g3", createdAt: "2025-12-15T08:00:00Z" },
  ],
  garmentTypes: [
    { id: "gt1", name: "Overol", pricePerUnit: 5.93, active: true, createdAt: "2025-12-01T08:00:00Z" },
    { id: "gt2", name: "Frazada", pricePerUnit: 7.00, active: true, createdAt: "2025-12-01T08:00:00Z" },
    { id: "gt3", name: "Camisa", pricePerUnit: 3.50, active: true, createdAt: "2025-12-01T08:00:00Z" },
    { id: "gt4", name: "Pantalon", pricePerUnit: 4.00, active: true, createdAt: "2025-12-01T08:00:00Z" },
    { id: "gt5", name: "Chaleco de seguridad", pricePerUnit: 5.00, active: true, createdAt: "2025-12-01T08:00:00Z" },
    { id: "gt6", name: "Ropa interior", pricePerUnit: 2.00, active: true, createdAt: "2025-12-01T08:00:00Z" },
    { id: "gt7", name: "Medias", pricePerUnit: 1.50, active: true, createdAt: "2025-12-01T08:00:00Z" },
  ],
  orders: [
    {
      id: "o1",
      workerId: "w1",
      groupId: "g1",
      createdAt: new Date().toISOString(),
      status: "recibido",
      notes: "Ropa muy sucia, necesita doble lavado",
      deliveredAt: null,
      items: [
        { id: "oi1", orderId: "o1", garmentTypeId: "gt1", quantity: 2, observations: "Manchas de grasa" },
        { id: "oi2", orderId: "o1", garmentTypeId: "gt2", quantity: 1, observations: "" },
        { id: "oi3", orderId: "o1", garmentTypeId: "gt4", quantity: 2, observations: "" },
      ],
    },
    {
      id: "o2",
      workerId: "w3",
      groupId: "g2",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      status: "lavando",
      notes: "",
      deliveredAt: null,
      items: [
        { id: "oi4", orderId: "o2", garmentTypeId: "gt1", quantity: 1, observations: "" },
        { id: "oi5", orderId: "o2", garmentTypeId: "gt3", quantity: 3, observations: "" },
        { id: "oi6", orderId: "o2", garmentTypeId: "gt6", quantity: 4, observations: "" },
      ],
    },
    {
      id: "o3",
      workerId: "w5",
      groupId: "g3",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      status: "listo",
      notes: "Listo para entrega",
      deliveredAt: null,
      items: [
        { id: "oi7", orderId: "o3", garmentTypeId: "gt2", quantity: 2, observations: "" },
        { id: "oi8", orderId: "o3", garmentTypeId: "gt5", quantity: 1, observations: "Roto en el bolsillo" },
      ],
    },
    {
      id: "o4",
      workerId: "w2",
      groupId: "g1",
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      status: "entregado",
      notes: "",
      deliveredAt: new Date(Date.now() - 86400000).toISOString(),
      items: [
        { id: "oi9", orderId: "o4", garmentTypeId: "gt1", quantity: 1, observations: "" },
        { id: "oi10", orderId: "o4", garmentTypeId: "gt7", quantity: 5, observations: "" },
      ],
    },
  ],
  valorizaciones: [
    {
      id: "v1",
      projectId: null,
      name: "Enero 2026",
      startDate: "2026-01-26",
      endDate: "2026-02-22",
      createdAt: "2026-01-26T08:00:00Z",
      actas: [
        {
          id: "a1",
          number: "",
          date: "2026-01-27",
          items: [
            { garmentTypeId: "gt2", quantity: 773 },
            { garmentTypeId: "gt1", quantity: 213 },
            { garmentTypeId: "gt4", quantity: 41 },
          ],
        },
        {
          id: "a2",
          number: "",
          date: "2026-02-03",
          items: [
            { garmentTypeId: "gt2", quantity: 784 },
            { garmentTypeId: "gt1", quantity: 256 },
            { garmentTypeId: "gt4", quantity: 56 },
          ],
        },
        {
          id: "a3",
          number: "",
          date: "2026-02-10",
          items: [
            { garmentTypeId: "gt2", quantity: 709 },
            { garmentTypeId: "gt1", quantity: 213 },
            { garmentTypeId: "gt4", quantity: 54 },
          ],
        },
      ],
      guias: [
        {
          id: "gu1",
          number: "2349",
          date: "2026-02-03",
          items: [
            { garmentTypeId: "gt2", quantity: 773 },
            { garmentTypeId: "gt1", quantity: 213 },
            { garmentTypeId: "gt4", quantity: 41 },
          ],
        },
        {
          id: "gu2",
          number: "2362",
          date: "2026-02-17",
          items: [
            { garmentTypeId: "gt2", quantity: 709 },
            { garmentTypeId: "gt1", quantity: 213 },
            { garmentTypeId: "gt4", quantity: 54 },
          ],
        },
      ],
    },
  ],
  projects: [],
  projectGarmentPrices: [],
  inventoryItems: [],
  inventoryMovements: [],
  employees: [],
  attendanceRecords: [],
  payrollPeriods: [],
}
