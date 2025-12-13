'use client'

import { Shield, Github, Trophy } from 'lucide-react'
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <span className="font-bold text-lg text-white">
                JoblessCoders
              </span>
            </Link>
            <p className="text-muted-foreground text-sm">
              The ultimate Clash Royale tournament platform for the JoblessCoders clan.
              Battle hard, play fair, have fun!
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-purple-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#tournaments" className="text-muted-foreground hover:text-purple-400 transition-colors">
                  Tournaments
                </Link>
              </li>
              <li>
                <Link href="/admin/create" className="text-muted-foreground hover:text-purple-400 transition-colors">
                  Create Tournament
                </Link>
              </li>
            </ul>
          </div>

          {/* Tournament info */}
          <div>
            <h4 className="font-semibold text-white mb-4">Tournament Format</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                12-Player League Format
              </li>
              <li className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-purple-400" />
                Top 8 Advance to Playoffs
              </li>
              <li className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-blue-400" />
                Single Elimination Finals
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} JoblessCoders Clan. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a 
              href="https://github.com/asifshawon" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
