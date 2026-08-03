import { create } from 'zustand'
import type { DockAssignment } from '@/lib/domain/receiving'
import * as api from '@/lib/api/receiving'

interface DockAssignmentState {
  assignment: DockAssignment | null
  loaded: boolean
  loading: boolean
  loadMyAssignment: () => Promise<DockAssignment | null>
  checkIn: (dockId: string) => Promise<DockAssignment>
  checkOut: () => Promise<DockAssignment>
  clear: () => void
}

export const useDockAssignmentStore = create<DockAssignmentState>((set) => ({
  assignment: null,
  loaded: false,
  loading: false,

  loadMyAssignment: async () => {
    set({ loading: true })
    try {
      const assignment = await api.getMyDockAssignment()
      set({ assignment, loaded: true, loading: false })
      return assignment
    } catch (error) {
      set({ loading: false, loaded: true })
      throw error
    }
  },

  checkIn: async (dockId) => {
    const assignment = await api.checkInDock(dockId)
    set({ assignment, loaded: true })
    return assignment
  },

  checkOut: async () => {
    const assignment = await api.checkOutDock()
    set({ assignment: null, loaded: true })
    return assignment
  },

  clear: () => set({ assignment: null, loaded: false }),
}))
