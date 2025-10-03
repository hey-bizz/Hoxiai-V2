"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, ExternalLink, Shield, Zap, Upload, FileText } from "lucide-react"
import Image from "next/image"

export default function VercelConnect() {
  const router = useRouter()
  const [stage, setStage] = useState<"intro" | "redirecting">("intro")

  const connectVercel = () => {
    setStage("redirecting")

    // Store return URL
    if (typeof window !== "undefined") {
      sessionStorage.setItem("return_url", window.location.href)
    }

    setTimeout(() => {
      router.push("/ai-analysis")
    }, 2000)
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
                <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center border border-gray-700">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                    <path d="M24 22.525H0l12-21.05 12 21.05z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Connect Vercel</h1>
                  <p className="text-gray-400">One-click authorization</p>
                </div>
              </div>

              <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 text-white">What will happen:</h3>
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <span className="text-green-500 font-bold">1.</span>
                      <span className="text-gray-300">You'll be redirected to Vercel</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-green-500 font-bold">2.</span>
                      <span className="text-gray-300">Approve Hoxi access (read-only)</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-green-500 font-bold">3.</span>
                      <span className="text-gray-300">Automatically return here</span>
                    </li>
                  </ol>

                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex gap-3">
                      <Zap className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-green-400">Fully Automatic</p>
                        <p className="text-xs text-gray-400 mt-1">
                          No manual steps required - complete setup in 10 seconds!
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex gap-3">
                      <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-400">Read-only Access</p>
                        <p className="text-xs text-gray-400 mt-1">
                          We only request permission to read your deployment analytics. No changes to your projects.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={connectVercel}
                size="lg"
                className="w-full px-6 py-4 bg-gradient-to-r from-black to-gray-800 text-white font-bold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all border border-gray-600"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 22.525H0l12-21.05 12 21.05z" />
                </svg>
                Continue with Vercel
                <ExternalLink className="w-5 h-5 ml-2" />
              </Button>

              <div className="relative mt-6">
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
                      <p className="text-sm text-gray-400">Alternative if API connection isn’t available</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mb-4">
                    Prefer manual analysis? Upload your server logs directly and our AI will analyze them for bot
                    detection patterns.
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
            </div>
          )}

          {stage === "redirecting" && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              <h2 className="text-xl font-bold text-white">Redirecting to Vercel...</h2>
              <p className="text-gray-400 mt-2">You'll be back in a few seconds</p>

              <div className="mt-8 space-y-3 text-left max-w-md mx-auto">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-300">Opening Vercel authorization</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-300">Waiting for approval...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
