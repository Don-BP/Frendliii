// venue-portal/src/components/BottomTabBar.tsx
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Tag, ScanLine, User, FileText } from 'lucide-react'

interface Props { role: 'owner' | 'staff' }

const ownerTabs = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/promotions', label: 'Promotions', icon: Tag },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/redeem', label: 'Redeem', icon: ScanLine },
  { to: '/profile', label: 'Profile', icon: User },
]
const staffTabs = [
  { to: '/redeem', label: 'Redeem', icon: ScanLine },
]

export function BottomTabBar({ role }: Props) {
  const tabs = role === 'owner' ? ownerTabs : staffTabs

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#FFFBF7] dark:bg-[#1A1225] border-t border-[#EEEAE3] dark:border-[#3D2E55] flex md:hidden z-40">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={label}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
              isActive
                ? 'text-[#FF7F61]'
                : 'text-[#8E8271] dark:text-[#9E8FC0] hover:text-[#2D1E4B] dark:hover:text-[#F0EBF8]'
            }`
          }
        >
          <Icon size={20} />
          <span className="mt-0.5">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
