import React, { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('frendli-theme') as Theme | null
    return stored === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    applyTheme(theme)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('frendli-theme', next)
      applyTheme(next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
