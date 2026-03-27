// venue-portal/src/components/Layout.tsx
import { Sidebar } from './Sidebar'
import { BottomTabBar } from './BottomTabBar'

interface Props {
  children: React.ReactNode
  role?: 'owner' | 'staff'
}

export function Layout({ children, role = 'owner' }: Props) {
  return (
    <div className="flex h-screen w-full bg-[#FFFBF7] dark:bg-[#1A1225] text-[#2D1E4B] dark:text-[#F0EBF8] overflow-hidden">
      <Sidebar role={role} />
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
      <BottomTabBar role={role} />
    </div>
  )
}
