import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { InboundPage } from '@/modules/inbound'
import { ReceivingDashboard } from '@/modules/receiving/Dashboard'
import { AsnListPage } from '@/modules/receiving/AsnListPage'
import { AsnDetailPage } from '@/modules/receiving/AsnDetailPage'
import { DocksPage } from '@/modules/receiving/DocksPage'
import { SessionPage } from '@/modules/receiving/SessionPage'
import { QcPage } from '@/modules/receiving/QcPage'
import { DiscrepanciesPage } from '@/modules/receiving/DiscrepanciesPage'
import { PutawayTasksPage } from '@/modules/receiving/PutawayTasksPage'
import { InventoryPage } from '@/modules/receiving/InventoryPage'
import { PutawayPage } from '@/modules/putaway'
import { PickingPage } from '@/modules/picking'
import { PackingPage } from '@/modules/packing'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/receiving" replace />} />
        <Route path="inbound" element={<InboundPage />} />
        <Route path="receiving" element={<ReceivingDashboard />} />
        <Route path="receiving/asn" element={<AsnListPage />} />
        <Route path="receiving/asn/:id" element={<AsnDetailPage />} />
        <Route path="receiving/docks" element={<DocksPage />} />
        <Route path="receiving/sessions/:id" element={<SessionPage />} />
        <Route path="receiving/qc" element={<QcPage />} />
        <Route path="receiving/discrepancies" element={<DiscrepanciesPage />} />
        <Route path="receiving/putaway-tasks" element={<PutawayTasksPage />} />
        <Route path="receiving/inventory" element={<InventoryPage />} />
        <Route path="putaway" element={<PutawayPage />} />
        <Route path="picking" element={<PickingPage />} />
        <Route path="packing" element={<PackingPage />} />
      </Route>
    </Routes>
  )
}
