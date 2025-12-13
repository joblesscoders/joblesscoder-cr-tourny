'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Shield, Lock, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

type AuthContextType = {
  isAuthenticated: boolean
  login: (password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// Simple admin password - in production, use environment variables and proper auth
const ADMIN_PASSWORD = 'joblesscoders2024'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check if already authenticated in this session
    const auth = sessionStorage.getItem('admin_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  const login = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      sessionStorage.setItem('admin_auth', 'true')
      return true
    }
    return false
  }

  const logout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem('admin_auth')
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AdminAuthGuardProps {
  children: ReactNode
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const { isAuthenticated, login } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setShowDialog(true)
    } else {
      setShowDialog(false)
    }
  }, [isAuthenticated])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (login(password)) {
      setError('')
      setShowDialog(false)
    } else {
      setError('Incorrect password. Please try again.')
      setPassword('')
    }
  }

  if (!isAuthenticated) {
    return (
      <Dialog open={showDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md glass-card border-purple-500/30" hideCloseButton>
          <DialogHeader className="text-center">
            <div className="mx-auto p-4 rounded-full bg-purple-500/20 w-fit mb-4">
              <Shield className="w-10 h-10 text-purple-400" />
            </div>
            <DialogTitle className="text-2xl text-white">Admin Access Required</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter the admin password to access the tournament management panel.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="pl-10 bg-secondary border-border focus:border-purple-500"
                  autoFocus
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Lock className="w-4 h-4 mr-2" />
              Unlock Admin Panel
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Contact a clan leader if you need access.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return <>{children}</>
}
