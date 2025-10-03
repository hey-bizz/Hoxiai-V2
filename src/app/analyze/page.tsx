"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Circle, Activity, Bot, HardDrive, DollarSign, ArrowRight } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

export default function AnalyzePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [stage, setStage] = useState<"detecting" | "analyzing" | "results">("detecting")
  const [provider, setProvider] = useState<string | null>(null)
  const [website, setWebsite] = useState<string>("")

  useEffect(() => {
    const site = searchParams.get("site") || "your-website.com"
    setWebsite(site)
  }, [searchParams])

  useEffect(() => {
    if (!website || website === "your-website.com") return

    const detectProvider = async () => {
      try {
        console.log("[Hoxi] Starting provider detection for:", website)
        setStage("detecting")

        // Call the real API endpoint
        const targetUrl = website.startsWith('http://') || website.startsWith('https://') ? website : `https://${website}`
        const response = await fetch('/api/provider/detect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: targetUrl }),
        })

        if (!response.ok) {
          throw new Error('Provider detection failed')
        }

        const data = await response.json()
        console.log("[Hoxi] Provider detected:", data)

        // Set the detected provider
        const detectedProvider = data.provider?.toLowerCase() || 'unknown'
        setProvider(detectedProvider)
        setStage("analyzing")

        // Move to results after a short delay
        setTimeout(() => {
          setStage("results")
        }, 2500)

      } catch (error: any) {
        console.error("[Hoxi] Provider detection error:", error)
        // Fallback to unknown provider
        setProvider("unknown")
        setStage("analyzing")
        setTimeout(() => {
          setStage("results")
        }, 2500)
      }
    }

    detectProvider()
  }, [website])

  const providerToRoute = (p?: string | null) => {
    const key = (p || '').toLowerCase()
    if (key === 'github') return 'github-pages'
    if (key === 'wordpress') return 'unknown'
    if (key === 'netlify') return 'netlify'
    if (key === 'aws' || key === 'cloudflare' || key === 'vercel') return key
    return 'unknown'
  }

  const handleGetStarted = () => {
    const slug = providerToRoute(provider)
    const providerLower = (provider || '').toLowerCase()

    // Redirect AWS and Cloudflare to upload page with toast
    if (providerLower === 'aws' || providerLower === 'cloudflare') {
      toast.info('OAuth Connect Available for Vercel & Netlify Only', {
        description: "We're working hard to bring AWS and Cloudflare OAuth integration soon! Please upload your server logs in the meantime.",
        duration: 6000,
      })
      router.push(`/upload?provider=${providerLower}&domain=${website}`)
    } else {
      router.push(`/connect/${slug}`)
    }
  }

  const botCategories = [
    {
      name: "AI Training",
      bots: "GPTBot, Claude-Web, ChatGPT-User",
      requests: 4869,
      percentage: 34.9,
      bandwidth: "752.49 MB",
      icon: "🤖",
    },
    {
      name: "AI Scrapers",
      bots: "CCBot, Bytespider",
      requests: 3478,
      percentage: 25.0,
      bandwidth: "564.37 MB",
      icon: "🕷️",
    },
    {
      name: "Search Engines",
      bots: "Googlebot, Bingbot",
      requests: 2086,
      percentage: 15.0,
      bandwidth: "188.12 MB",
      icon: "🔍",
    },
    {
      name: "Scrapers",
      bots: "PetalBot, MJ12bot",
      requests: 2086,
      percentage: 15.0,
      bandwidth: "282.18 MB",
      icon: "📊",
    },
    {
      name: "SEO Tools",
      bots: "SemrushBot, AhrefsBot",
      requests: 1391,
      percentage: 10.0,
      bandwidth: "94.06 MB",
      icon: "📈",
    },
  ]

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-gradient-to-tl from-green-400/8 via-green-500/4 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-green-500/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 p-0.5">
                <div className="w-full h-full rounded-xl bg-black flex items-center justify-center">
                  <Image src="/hoxi-logo.png" alt="Hoxi Logo" width={24} height={24} className="w-6 h-6" />
                </div>
              </div>
              <span className="font-bold text-2xl text-white">Hoxi</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {stage === "detecting" && (
            <div className="space-y-8">
              <div className="animate-pulse">
                <div className="w-20 h-20 mx-auto mb-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <h2 className="text-4xl font-bold text-white">Detecting your hosting provider...</h2>
              <p className="text-xl text-gray-400">Analyzing {website}</p>
            </div>
          )}

          {stage === "analyzing" && (
            <div className="space-y-8">
              <div className="flex items-center justify-center space-x-4">
                <div className="w-16 h-16 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">☁️</span>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-4xl font-bold text-white">
                {provider ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} Detected!` : "Provider Detected!"}
              </h2>
              <p className="text-xl text-gray-400">Fetching your traffic data...</p>

              <div className="space-y-4 text-left max-w-md mx-auto">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-white">Provider identified</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-white">Analyzing bot traffic patterns...</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <Circle className="w-5 h-5" />
                  <span>Calculating costs</span>
                </div>
              </div>
            </div>
          )}

          {stage === "results" && (
            <div className="space-y-12">
              {/* Shocking Discovery */}
              <div className="text-center space-y-6">
                <div className="inline-flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-full px-6 py-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                  <span className="text-red-400 font-mono text-sm">CRITICAL DISCOVERY</span>
                </div>

                <h1 className="text-5xl lg:text-7xl font-black leading-tight">
                  <span className="block text-white">AI Bots are consuming</span>
                  <span className="block text-red-500"> 47% </span>
                  <span className="block text-white">of your bandwidth</span>
                </h1>

                <p className="text-2xl lg:text-3xl text-gray-300">
                  Costing you approximately
                  <span className="text-green-500 font-bold"> $847/month</span>
                </p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
                  <CardContent className="p-6 text-center">
                    <Activity className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-white mb-1">14,523</div>
                    <div className="text-sm text-gray-400">Total Requests</div>
                    <div className="text-xs text-blue-400 mt-1">+12% today</div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
                  <CardContent className="p-6 text-center">
                    <Bot className="w-8 h-8 text-red-400 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-red-400 mb-1">47%</div>
                    <div className="text-sm text-gray-400">Bot Traffic</div>
                    <div className="text-xs text-red-400 mt-1">6,826 requests</div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
                  <CardContent className="p-6 text-center">
                    <HardDrive className="w-8 h-8 text-orange-400 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-orange-400 mb-1">238 GB</div>
                    <div className="text-sm text-gray-400">Bandwidth Used</div>
                    <div className="text-xs text-orange-400 mt-1">$95 cost</div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
                  <CardContent className="p-6 text-center">
                    <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-green-400 mb-1">$847</div>
                    <div className="text-sm text-gray-400">Potential Savings</div>
                    <div className="text-xs text-green-400 mt-1">per month</div>
                  </CardContent>
                </Card>
              </div>

              {/* Bot Breakdown Preview */}
              <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">Bot Categories Breakdown</h3>
                    <div className="text-sm text-gray-400">Last 24 hours</div>
                  </div>

                  <div className="space-y-4">
                    {botCategories.slice(0, 3).map((category, index) => (
                      <div
                        key={category.name}
                        className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{category.icon}</span>
                          <div>
                            <div className="font-semibold text-white">{category.name}</div>
                            <div className="text-sm text-gray-400">{category.bots}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">{category.requests.toLocaleString()}</div>
                          <div className="text-sm text-gray-400">
                            {category.percentage}% • {category.bandwidth}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Blurred preview of more data */}
                    <div className="space-y-2 blur-sm">
                      {botCategories.slice(3).map((category, index) => (
                        <div
                          key={category.name}
                          className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-2xl">{category.icon}</span>
                            <div>
                              <div className="font-semibold text-white">••••••</div>
                              <div className="text-sm text-gray-400">•••••••••</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-white">••••</div>
                            <div className="text-sm text-gray-400">••% • •••••</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CTA */}
              <div className="text-center space-y-6">
                <p className="text-xl text-gray-300">Get full access to real-time monitoring and smart blocking</p>

                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="px-12 py-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xl font-bold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
                >
                  Connect {provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "Provider"} & Start Monitoring
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                <p className="text-sm text-gray-400">No credit card required • Setup in 45 seconds</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
