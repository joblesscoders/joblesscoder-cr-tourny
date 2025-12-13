'use client'

import Link from 'next/link'
import { Trophy, Shield, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <span className="font-bold text-lg text-white hidden sm:block">
              JoblessCoders
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              href="/#tournaments" 
              className="text-muted-foreground hover:text-white transition-colors"
            >
              Tournaments
            </Link>
            <Link 
              href="/admin/create"
            >
              <Button variant="outline" className="border-purple-500/50 hover:bg-purple-500/20">
                <Trophy className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-3">
            <Link 
              href="/#tournaments" 
              className="block py-2 text-muted-foreground hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Tournaments
            </Link>
            <Link href="/admin/create" onClick={() => setIsOpen(false)}>
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                <Trophy className="w-4 h-4 mr-2" />
                Admin Panel
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
