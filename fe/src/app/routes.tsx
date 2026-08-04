import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DockAssignmentGuard } from '@/components/receiving/DockAssignmentGuard'
import { LoginPage } from '@/modules/auth/LoginPage'
import { InboundPage } from '@/modules/inbound'
import { ReceivingHome } from '@/modules/receiving/ReceivingHome'
import { ReceivingDashboard } from '@/modules/receiving/Dashboard'
import { AsnListPage } from '@/modules/receiving/AsnListPage'
import { AsnDetailPage } from '@/modules/receiving/AsnDetailPage'
import { DockCheckInPage } from '@/modules/receiving/DockCheckInPage'
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
import { useDockAssignmentStore } from '@/store/dockAssignmentStore'

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

function DockAssignmentBootstrap() {
  const user = useAuthStore((s) => s.user)
  const loadMyAssignment = useDockAssignmentStore((s) => s.loadMyAssignment)
  const clear = useDockAssignmentStore((s) => s.clear)

  useEffect(() => {
    if (user) {
      void loadMyAssignment()
    } else {
      clear()
    }
  }, [user, loadMyAssignment, clear])

  return <Outlet />
}

export function AppRoutes() {
  return (
    <AuthBootstrap>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DockAssignmentBootstrap />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/receiving" replace />} />
              <Route path="inbound" element={<InboundPage />} />
              <Route
                path="receiving/check-in"
                element={<DockCheckInPage />}
              />
              <Route element={<DockAssignmentGuard />}>
                <Route path="receiving" element={<ReceivingHome />} />
                <Route
                  path="receiving/dashboard"
                  element={<ReceivingDashboard />}
                />
                <Route path="receiving/asn" element={<AsnListPage />} />
                <Route path="receiving/asn/:id" element={<AsnDetailPage />} />
                <Route path="receiving/docks" element={<DocksPage />} />
                <Route
                  path="receiving/sessions/:id"
                  element={<SessionPage />}
                />
                <Route path="receiving/qc" element={<QcPage />} />
                <Route
                  path="receiving/discrepancies"
                  element={<DiscrepanciesPage />}
                />
                <Route
                  path="receiving/putaway-tasks"
                  element={<PutawayTasksPage />}
                />
                <Route
                  path="receiving/inventory"
                  element={<InventoryPage />}
                />
              </Route>
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
