import { Sidebar } from './Sidebar'
import { BottomTabBar } from './BottomTabBar'

interface Props {
  children: React.ReactNode
  role?: 'owner' | 'staff'
}

export function Layout({ children, role = 'owner' }: Props) {
  return (
    <div className="flex h-screen w-full bg-[#0a0f1a] text-slate-200 overflow-hidden">
      <Sidebar role={role} />
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
      <BottomTabBar role={role} />
    </div>
  )
}
