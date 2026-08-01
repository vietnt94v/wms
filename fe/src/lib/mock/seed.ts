import type {
  ASN,
  Dock,
  InventoryRecord,
  Product,
  PurchaseOrder,
  Supplier,
} from '@/lib/domain/receiving'

export const suppliers: Supplier[] = [
  { id: 'SUP-01', name: 'Acme Supplies' },
  { id: 'SUP-02', name: 'Northwind Trading' },
]

export const products: Product[] = [
  {
    sku: 'SKU-MILK-1L',
    name: 'UHT Milk 1L',
    uom: 'EA',
    requiresLotExpiry: true,
    shelfLifeDays: 90,
  },
  {
    sku: 'SKU-RICE-5KG',
    name: 'Jasmine Rice 5kg',
    uom: 'BAG',
    requiresLotExpiry: false,
  },
  {
    sku: 'SKU-SOAP-100',
    name: 'Hand Soap 100ml',
    uom: 'EA',
    requiresLotExpiry: false,
  },
  {
    sku: 'SKU-OIL-1L',
    name: 'Cooking Oil 1L',
    uom: 'EA',
    requiresLotExpiry: true,
    shelfLifeDays: 365,
  },
]

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: 'PO-1001',
    supplierId: 'SUP-01',
    status: 'OPEN',
    lines: [
      { sku: 'SKU-MILK-1L', qty: 200 },
      { sku: 'SKU-RICE-5KG', qty: 50 },
    ],
  },
  {
    id: 'PO-1002',
    supplierId: 'SUP-02',
    status: 'OPEN',
    lines: [
      { sku: 'SKU-SOAP-100', qty: 500 },
      { sku: 'SKU-OIL-1L', qty: 120 },
    ],
  },
]

export const docks: Dock[] = [
  { id: 'D01', name: 'Dock 01', status: 'AVAILABLE' },
  { id: 'D02', name: 'Dock 02', status: 'AVAILABLE' },
  { id: 'D03', name: 'Dock 03', status: 'AVAILABLE' },
  { id: 'D04', name: 'Dock 04', status: 'AVAILABLE' },
  { id: 'D05', name: 'Dock 05', status: 'AVAILABLE' },
]

export const asns: ASN[] = [
  {
    id: 'ASN-9001',
    poId: 'PO-1001',
    type: 'SSCC',
    carrier: 'VietTrans',
    plateNo: '51C-12345',
    status: 'EXPECTED',
    eta: new Date().toISOString(),
    lines: [
      { sku: 'SKU-MILK-1L', expectedQty: 200, receivedQty: 0 },
      { sku: 'SKU-RICE-5KG', expectedQty: 50, receivedQty: 0 },
    ],
    pallets: [
      {
        sscc: '00012345678901234567',
        destinationWh: 'WH-01',
        items: [
          { sku: 'SKU-MILK-1L', qty: 100, lot: 'LOT-A1', expiry: '2026-12-01' },
          { sku: 'SKU-RICE-5KG', qty: 25 },
        ],
      },
      {
        sscc: '00012345678901234568',
        destinationWh: 'WH-01',
        items: [
          { sku: 'SKU-MILK-1L', qty: 100, lot: 'LOT-A2', expiry: '2026-12-15' },
          { sku: 'SKU-RICE-5KG', qty: 25 },
        ],
      },
      {
        sscc: '00012345678901234999',
        destinationWh: 'WH-02',
        items: [{ sku: 'SKU-MILK-1L', qty: 20, lot: 'LOT-X', expiry: '2026-11-01' }],
      },
    ],
  },
  {
    id: 'ASN-9002',
    poId: 'PO-1002',
    type: 'CONTAINER',
    carrier: 'FastHaul',
    plateNo: '51C-67890',
    status: 'EXPECTED',
    eta: new Date().toISOString(),
    lines: [
      { sku: 'SKU-SOAP-100', expectedQty: 500, receivedQty: 0 },
      { sku: 'SKU-OIL-1L', expectedQty: 120, receivedQty: 0 },
    ],
    pallets: [],
  },
]

export const inventory: InventoryRecord[] = products.map((p) => ({
  sku: p.sku,
  available: 0,
  quarantine: 0,
}))

export const seedData = {
  suppliers,
  products,
  purchaseOrders,
  docks,
  asns,
  inventory,
  appointments: [] as never[],
  sessions: [] as never[],
  discrepancies: [] as never[],
  qcResults: [] as never[],
  putawayTasks: [] as never[],
}
