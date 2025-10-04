"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { Activity, Shield, Zap } from "lucide-react"

export default function HoxiLanding() {
  const [url, setUrl] = useState("")
  const [totalRequests, setTotalRequests] = useState(3992)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      setTotalRequests((prev) => prev + Math.floor(Math.random() * 5))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleAnalyze = async () => {
    if (url) {
      setIsAnalyzing(true)
      setTimeout(() => {
        setIsAnalyzing(false)
        router.push(`/analyze?site=${encodeURIComponent(url)}`)
      }, 1000)
    }
  }

  const features = [
    {
      icon: Activity,
      title: "Real-Time Analytics",
      description: "Monitor traffic patterns and bot behavior as it happens with millisecond precision.",
    },
    {
      icon: Shield,
      title: "Advanced Bot Detection",
      description:
        "Identify AI crawlers, scrapers, and social bots with 99.7% accuracy using Hoxi traffic intelligence",
    },
    {
      icon: Zap,
      title: "Instant Implementation",
      description: "Deploy protection in under 60 seconds with our one-click integration system.",
    },
  ]

  return (
    <div className="min-h-screen bg-black dark">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-800">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <Image
                  src="/hoxi-logo.png"
                  alt="Hoxi Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-bold text-2xl text-white">Hoxi</span>
                <Badge variant="secondary" className="ml-2 text-xs bg-green-400/20 text-green-400 border-green-400/30">
                  LIVE
                </Badge>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-800">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-green-400 hover:bg-green-500 text-black font-semibold">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 via-transparent to-emerald-500/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Status Badge */}
            <Badge variant="secondary" className="px-4 py-2 text-sm bg-gray-800/50 text-gray-300 border-gray-700">
              <Activity className="w-4 h-4 mr-2" />
              Trusted by 2,500+ developers worldwide
            </Badge>

            {/* Main Headline */}
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight text-balance text-white">
                AI, Scrapers, Social Bots… <span className="text-green-400">Let's Get Real About Your Traffic!</span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-3xl mx-auto text-pretty">
                Traffic transparency unlocked. Humans, bots, AI—even the sneaky ones. Track it all,{" "}
                <span className="text-green-400 font-semibold">make smart moves in seconds</span>.
              </p>
            </div>

            {/* CTA Section */}
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  type="url"
                  placeholder="https://your-website.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 h-14 text-lg bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                  autoComplete="url"
                  aria-label="Enter your website URL for analysis"
                />
                <Button
                  onClick={handleAnalyze}
                  size="lg"
                  disabled={isAnalyzing}
                  className="h-14 px-8 bg-green-400 hover:bg-green-500 text-black text-lg font-semibold"
                >
                  {isAnalyzing ? "Analyzing..." : "Analyze Now"}
                </Button>
              </div>

              <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Free analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>No signup required</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Instant results</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      
    </div>
  )
}
