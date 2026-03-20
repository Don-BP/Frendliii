import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Tag, ScanLine, User, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

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
    <aside className="hidden md:flex flex-col w-56 bg-slate-900 border-r border-slate-700 h-full">
      <div className="p-4 border-b border-slate-700 flex items-center gap-3">
        {venue?.logo_url
          ? <img src={venue.logo_url} alt="Logo" className="w-9 h-9 rounded-full object-cover" />
          : <div className="w-9 h-9 rounded-full bg-indigo-700 flex items-center justify-center text-sm font-bold text-white">
              {venue?.name?.[0] ?? 'V'}
            </div>
        }
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-slate-200 truncate">{venue?.name ?? 'Your Venue'}</p>
          <p className="text-xs text-slate-500 capitalize">
            {venue?.tier ?? 'listed'}
            {venue?.tier_payment_status === 'pending' && ' · Pending'}
          </p>
        </div>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
