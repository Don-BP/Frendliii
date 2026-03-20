import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Tag, ScanLine, User } from 'lucide-react'

interface Props { role: 'owner' | 'staff' }

const ownerTabs = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/promotions', label: 'Promotions', icon: Tag },
  { to: '/redeem', label: 'Redeem', icon: ScanLine },
  { to: '/profile', label: 'Profile', icon: User },
]
const staffTabs = [
  { to: '/redeem', label: 'Redeem', icon: ScanLine },
]

export function BottomTabBar({ role }: Props) {
  const tabs = role === 'owner' ? ownerTabs : staffTabs

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 flex md:hidden">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={label}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
              isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
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
