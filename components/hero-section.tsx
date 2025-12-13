'use client'

import { Crown, Swords, Trophy, Users, Zap, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export function HeroSection() {
  return (
    <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden hero-gradient">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Floating icons */}
      <div className="absolute inset-0 pointer-events-none">
        <Crown className="absolute top-[15%] left-[10%] w-8 h-8 text-yellow-400/40 animate-float" style={{ animationDelay: '0s' }} />
        <Shield className="absolute top-[25%] right-[15%] w-10 h-10 text-blue-400/40 animate-float" style={{ animationDelay: '0.5s' }} />
        <Swords className="absolute bottom-[30%] left-[15%] w-12 h-12 text-red-400/40 animate-float" style={{ animationDelay: '1s' }} />
        <Trophy className="absolute bottom-[20%] right-[10%] w-8 h-8 text-yellow-400/40 animate-float" style={{ animationDelay: '1.5s' }} />
        <Zap className="absolute top-[40%] left-[5%] w-6 h-6 text-purple-400/40 animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Clan badge */}
        <div className="inline-flex items-center gap-2 mb-6">
          <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Shield className="w-4 h-4 mr-2" />
            JOBLESSCODERS CLAN
          </Badge>
        </div>

        {/* Main title */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight">
          <span className="gradient-text">CLASH ROYALE</span>
          <br />
          <span className="text-white">TOURNAMENT</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-2xl mx-auto">
          Battle your way to glory in the ultimate clan tournament. 
          <span className="text-purple-400"> May the best player reign supreme!</span>
        </p>

        {/* Tournament type badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <Badge className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
            <Users className="w-4 h-4 mr-2" />
            Current: 1v1 Battle
          </Badge>
          <Badge variant="outline" className="px-4 py-2 border-purple-500/50 text-purple-300">
            <Swords className="w-4 h-4 mr-2" />
            Next: 2v2 Battle
          </Badge>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="#tournaments">
            <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 animate-pulse-glow">
              <Trophy className="w-5 h-5 mr-2" />
              View Tournaments
            </Button>
          </Link>
          <Link href="/admin/create">
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-purple-500/50 hover:bg-purple-500/20">
              <Crown className="w-5 h-5 mr-2" />
              Admin Panel
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white">12</div>
            <div className="text-sm text-muted-foreground">Players</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-yellow-400">66</div>
            <div className="text-sm text-muted-foreground">League Matches</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-purple-400">8</div>
            <div className="text-sm text-muted-foreground">Playoff Spots</div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-white/50 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  )
}
