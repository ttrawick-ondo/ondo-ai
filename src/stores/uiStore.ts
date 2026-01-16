import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { ModalType } from '@/types'

interface UIState {
  // Sidebar
  sidebarOpen: boolean
  sidebarWidth: number

  // Modals
  activeModal: ModalType
  modalProps: Record<string, unknown>

  // Command palette
  commandPaletteOpen: boolean

  // Mobile
  mobileNavOpen: boolean
}

interface UIActions {
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  openModal: (type: ModalType, props?: Record<string, unknown>) => void
  closeModal: () => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
  toggleMobileNav: () => void
  setMobileNavOpen: (open: boolean) => void
}

type UIStore = UIState & { actions: UIActions }

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        sidebarWidth: 280,
        activeModal: null,
        modalProps: {},
        commandPaletteOpen: false,
        mobileNavOpen: false,

        actions: {
          toggleSidebar: () => {
            set((state) => ({ sidebarOpen: !state.sidebarOpen }))
          },

          setSidebarOpen: (open) => {
            set({ sidebarOpen: open })
          },

          setSidebarWidth: (width) => {
            set({ sidebarWidth: Math.min(Math.max(width, 200), 400) })
          },

          openModal: (type, props = {}) => {
            set({ activeModal: type, modalProps: props })
          },

          closeModal: () => {
            set({ activeModal: null, modalProps: {} })
          },

          toggleCommandPalette: () => {
            set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen }))
          },

          setCommandPaletteOpen: (open) => {
            set({ commandPaletteOpen: open })
          },

          toggleMobileNav: () => {
            set((state) => ({ mobileNavOpen: !state.mobileNavOpen }))
          },

          setMobileNavOpen: (open) => {
            set({ mobileNavOpen: open })
          },
        },
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          sidebarWidth: state.sidebarWidth,
        }),
      }
    ),
    { name: 'ui-store' }
  )
)

// Selector hooks
export const useSidebarOpen = () => useUIStore((state) => state.sidebarOpen)
export const useSidebarWidth = () => useUIStore((state) => state.sidebarWidth)
export const useActiveModal = () => useUIStore((state) => state.activeModal)
export const useModalProps = () => useUIStore((state) => state.modalProps)
export const useCommandPaletteOpen = () => useUIStore((state) => state.commandPaletteOpen)
export const useMobileNavOpen = () => useUIStore((state) => state.mobileNavOpen)
export const useUIActions = () => useUIStore.getState().actions
