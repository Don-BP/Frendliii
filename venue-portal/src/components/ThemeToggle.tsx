import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#8E8271] dark:text-[#9E8FC0] hover:bg-[#F5EEE6] dark:hover:bg-[#2D2040] transition-colors"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}
