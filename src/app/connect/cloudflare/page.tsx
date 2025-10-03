"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, ExternalLink, Copy, AlertTriangle, Shield, Upload, FileText } from "lucide-react"
import Image from "next/image"

export default function CloudflareConnect() {
  const router = useRouter()
  const [stage, setStage] = useState<"intro" | "connecting" | "validating" | "success" | "upload">("intro")
  const [token, setToken] = useState("")
  const [popup, setPopup] = useState<Window | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startConnection = () => {
    setStage("connecting")
    setError(null)

    // Open Cloudflare in popup
    const cfPopup = window.open(
      "https://dash.cloudflare.com/profile/api-tokens",
      "cloudflare-auth",
      "width=1200,height=700,left=200,top=100",
    )

    setPopup(cfPopup)

    // Poll for popup close
    const checkPopup = setInterval(() => {
      if (cfPopup?.closed) {
        clearInterval(checkPopup)
        if (!token) {
          // User closed without completing - stay on connecting stage
        }
      }
    }, 1000)

    // Auto-focus paste field
    setTimeout(() => {
      document.getElementById("token-input")?.focus()
    }, 100)
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const pastedToken = e.clipboardData.getData("text").trim()

    if (pastedToken.length > 0) {
      setToken(pastedToken)
      setStage("validating")
      setError(null)

      // Close popup if still open
      popup?.close()

      setTimeout(() => {
        setStage("success")
        setTimeout(() => {
          router.push("/ai-analysis")
        }, 2000)
      }, 2000)
    } else {
      setError("Please paste a valid token from Cloudflare.")
    }
  }

  const handleManualInput = () => {
    if (token.length > 0) {
      setStage("validating")
      setError(null)

      setTimeout(() => {
        setStage("success")
        setTimeout(() => {
          router.push("/ai-analysis")
        }, 2000)
      }, 2000)
    } else {
      setError("Please enter a valid Cloudflare API token.")
    }
  }

  const handleUploadOption = () => {
    router.push("/upload?open=1")
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

          {stage === "intro" && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-3xl">☁️</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Connect Cloudflare</h1>
                  <p className="text-gray-400">One-time setup, takes 45 seconds</p>
                </div>
              </div>

              <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 text-white">What will happen:</h3>
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <span className="text-green-500 font-bold">1.</span>
                      <span className="text-gray-300">Cloudflare will open in a popup window</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-green-500 font-bold">2.</span>
                      <span className="text-gray-300">Create an API token (we'll guide you)</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-green-500 font-bold">3.</span>
                      <span className="text-gray-300">Copy and paste it back here</span>
                    </li>
                  </ol>

                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex gap-3">
                      <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-green-400">Read-only access</p>
                        <p className="text-xs text-gray-400 mt-1">
                          We only request permission to read your analytics data. No changes to your Cloudflare
                          settings.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={startConnection}
                size="lg"
                className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
              >
                Connect Cloudflare
                <ExternalLink className="w-5 h-5 ml-2" />
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-black text-gray-400">or</span>
                </div>
              </div>

              <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Upload className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Upload Server Logs</h3>
                      <p className="text-sm text-gray-400">Alternative if API connection fails</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mb-4">
                    Can't connect via API? Upload your server logs directly and our AI will analyze them for bot
                    detection patterns.
                  </p>
                  <Button
                    onClick={handleUploadOption}
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Upload Logs Instead
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {stage === "connecting" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Complete Setup in Cloudflare</h2>

              <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      <span className="text-gray-300">Cloudflare opened in new window</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-300">Create your API token...</span>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <p className="text-sm font-semibold mb-2 text-blue-400">Quick Instructions:</p>
                      <ol className="text-sm space-y-1 text-gray-300">
                        <li>1. Click "Create Token"</li>
                        <li>2. Use "Read all resources" template</li>
                        <li>3. Click "Continue to summary"</li>
                        <li>4. Click "Create Token"</li>
                        <li>5. Copy the token shown</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    id="token-input"
                    type="password"
                    placeholder="Paste your token here (auto-detected)..."
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg pr-12 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    onPaste={handlePaste}
                    autoFocus
                  />
                  <Copy className="absolute right-3 top-3 w-6 h-6 text-gray-500" />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  onClick={handleManualInput}
                  disabled={!token}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Validate Token
                </Button>
              </div>

              <button
                onClick={() => window.open("https://dash.cloudflare.com/profile/api-tokens", "_blank")}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Popup blocked? Open Cloudflare manually →
              </button>

              <div className="mt-8 pt-6 border-t border-gray-700">
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-4">Having trouble connecting?</p>
                  <Button
                    onClick={handleUploadOption}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Server Logs Instead
                  </Button>
                </div>
              </div>
            </div>
          )}

          {stage === "validating" && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              <h2 className="text-xl font-bold text-white">Validating token...</h2>
              <p className="text-gray-400 mt-2">Checking permissions and connecting</p>
            </div>
          )}

          {stage === "success" && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Successfully Connected!</h2>
              <p className="text-gray-400 mt-2">Redirecting to AI analysis page...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
