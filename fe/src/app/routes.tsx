import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { DataLoader } from './DataLoader'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoginPage } from '@/modules/auth/LoginPage'
import { InboundPage } from '@/modules/inbound'
import { ReceivingHome } from '@/modules/receiving/ReceivingHome'
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
import { useAuthStore } from '@/store/authStore'

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const bootstrap = useAuthStore((s) => s.bootstrap)
  const initialized = useAuthStore((s) => s.initialized)

  useEffect(() => {
    if (!initialized) {
      void bootstrap()
    }
  }, [bootstrap, initialized])

  return <>{children}</>
}

export function AppRoutes() {
  return (
    <AuthBootstrap>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route element={<DataLoader />}>
              <Route index element={<Navigate to="/receiving" replace />} />
              <Route path="inbound" element={<InboundPage />} />
              <Route path="receiving" element={<ReceivingHome />} />
              <Route path="receiving/dashboard" element={<ReceivingDashboard />} />
              <Route path="receiving/asn" element={<AsnListPage />} />
              <Route path="receiving/asn/:id" element={<AsnDetailPage />} />
              <Route path="receiving/docks" element={<DocksPage />} />
              <Route path="receiving/sessions/:id" element={<SessionPage />} />
              <Route path="receiving/qc" element={<QcPage />} />
              <Route
                path="receiving/discrepancies"
                element={<DiscrepanciesPage />}
              />
              <Route
                path="receiving/putaway-tasks"
                element={<PutawayTasksPage />}
              />
              <Route path="receiving/inventory" element={<InventoryPage />} />
              <Route path="putaway" element={<PutawayPage />} />
              <Route path="picking" element={<PickingPage />} />
              <Route path="packing" element={<PackingPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthBootstrap>
  )
}
