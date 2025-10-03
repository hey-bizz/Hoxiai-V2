"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink, Code, HelpCircle, Upload, FileText } from "lucide-react"
import Image from "next/image"

export default function UnknownProviderConnect() {
  const router = useRouter()
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  const providers = [
    {
      id: "cloudflare",
      name: "Cloudflare",
      icon: "☁️",
      time: "45 seconds",
      description: "CDN and security services",
    },
    {
      id: "vercel",
      name: "Vercel",
      icon: "▲",
      time: "10 seconds",
      description: "Frontend deployment platform",
    },
    {
      id: "aws",
      name: "AWS",
      icon: "🟠",
      time: "2-5 minutes",
      description: "Amazon Web Services",
    },
    {
      id: "netlify",
      name: "Netlify",
      icon: "🌐",
      time: "10 seconds",
      description: "JAMstack deployment",
    },
    {
      id: "github-pages",
      name: "GitHub Pages",
      icon: "🐙",
      time: "15 seconds",
      description: "Static site hosting",
    },
    {
      id: "other",
      name: "Other",
      icon: "❓",
      time: "1 minute",
      description: "Custom setup",
    },
  ]

  const generateSiteId = (): string => {
    return Math.random().toString(36).substring(2, 15)
  }

  const handleProviderSelect = (providerId: string) => {
    if (providerId === "other") {
      // Show JavaScript snippet option
      setSelectedProvider("other")
    } else {
      router.push(`/connect/${providerId}`)
    }
  }

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

      <div className="relative p-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Step 2 of 2</span>
              <span>100% complete</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: "100%" }} />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Provider Not Detected</h1>
              <p className="text-gray-400 mt-2">We couldn't automatically detect your hosting provider</p>
            </div>

          <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 text-white">Choose your provider manually:</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {providers.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => handleProviderSelect(provider.id)}
                      className="p-4 border border-gray-700 rounded-lg hover:bg-gray-800 hover:border-green-500/50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{provider.icon}</span>
                        <div>
                          <div className="font-semibold text-white group-hover:text-green-400 transition-colors">
                            {provider.name}
                          </div>
                          <div className="text-xs text-gray-400">{provider.description}</div>
                        </div>
                      </div>
                      <div className="text-xs text-green-400">Setup time: {provider.time}</div>
                    </button>
                  ))}
                </div>
            </CardContent>
          </Card>

            {/* Alternative: Upload Logs */}
            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Upload Server Logs</h3>
                    <p className="text-sm text-gray-400">Universal option — works for any provider</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300 mb-4">
                  Not sure about your provider? Upload your logs and we’ll analyze them right away.
                </p>
                <Button
                  onClick={() => router.push("/upload?open=1")}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Upload Logs Instead
                </Button>
              </CardContent>
            </Card>

            {selectedProvider === "other" && (
              <Card className="bg-blue-500/10 border-blue-500/20 backdrop-blur-xl">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Code className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-2 text-blue-400">Alternative: JavaScript Snippet</h4>
                      <p className="text-sm text-gray-400 mb-3">
                        Add this script to your website for automatic monitoring:
                      </p>
                    </div>
                  </div>

                  <div className="bg-black rounded-lg p-4 mb-4">
                    <code className="text-xs text-green-400 break-all">
                      {`<script src="https://cdn.hoxi.com/monitor.js" data-site-id="${generateSiteId()}"></script>`}
                    </code>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        const script = `<script src="https://cdn.hoxi.com/monitor.js" data-site-id="${generateSiteId()}"></script>`
                        navigator.clipboard.writeText(script)
                      }}
                      variant="outline"
                      className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                    >
                      Copy Script
                    </Button>
                    <Button
                      onClick={() => router.push("/dashboard")}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Continue to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-2 text-white">Need Help?</h4>
                    <p className="text-sm text-gray-400 mb-3">
                      Can't find your provider or need assistance with setup?
                    </p>
                    <Button
                      onClick={() => window.open("mailto:support@hoxi.com", "_blank")}
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Contact Support
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
