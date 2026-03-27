// venue-portal/src/components/Sidebar.tsx
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Tag, ScanLine, User, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from './ThemeToggle'

interface Props { role?: 'owner' | 'staff' }

const ownerNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/promotions', label: 'Promotions', icon: Tag },
  { to: '/redeem', label: 'Redeem', icon: ScanLine },
  { to: '/profile', label: 'Profile', icon: User },
]
const staffNav = [
  { to: '/redeem', label: 'Redeem', icon: ScanLine },
]

export function Sidebar({ role = 'owner' }: Props) {
  const { venue } = useAuth()
  const nav = role === 'owner' ? ownerNav : staffNav

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="hidden md:flex flex-col w-60 bg-[#FFFBF7] dark:bg-[#1A1225] border-r border-[#EEEAE3] dark:border-[#3D2E55] h-full flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-[#EEEAE3] dark:border-[#3D2E55] flex items-center gap-3">
        {venue?.logo_url
          ? <img src={venue.logo_url} alt="Logo" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          : <div className="w-9 h-9 rounded-full bg-[#FF7F61] flex items-center justify-center text-sm font-bold text-white flex-shrink-0 font-['Bricolage_Grotesque']">
              {venue?.name?.[0]?.toUpperCase() ?? 'V'}
            </div>
        }
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-[#2D1E4B] dark:text-[#F0EBF8] truncate font-['Bricolage_Grotesque']">
            {venue?.name ?? 'Your Venue'}
          </p>
          <p className="text-xs text-[#8E8271] dark:text-[#9E8FC0] capitalize">
            {venue?.tier ?? 'listed'}
            {venue?.tier_payment_status === 'pending' && ' · Pending'}
          </p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? 'bg-[#FFF1EE] dark:bg-[#2D1225] text-[#FF7F61] font-medium border-l-2 border-[#FF7F61] pl-[10px]'
                  : 'text-[#8E8271] dark:text-[#9E8FC0] hover:text-[#2D1E4B] dark:hover:text-[#F0EBF8] hover:bg-[#F5EEE6] dark:hover:bg-[#2D2040]'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer: theme toggle + logout */}
      <div className="p-2 border-t border-[#EEEAE3] dark:border-[#3D2E55] space-y-0.5">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#8E8271] dark:text-[#9E8FC0] hover:text-[#2D1E4B] dark:hover:text-[#F0EBF8] hover:bg-[#F5EEE6] dark:hover:bg-[#2D2040] transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
