"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function AIAnalysisPage() {
  const router = useRouter()
  const [stage, setStage] = useState<"initializing" | "scanning" | "analyzing" | "processing" | "complete">(
    "initializing",
  )
  const [progress, setProgress] = useState(0)
  const [currentTask, setCurrentTask] = useState("Initializing Hoxi AI...")

  useEffect(() => {
    const stages = [
      { stage: "initializing", task: "Initializing Hoxi AI...", duration: 2000, progress: 15 },
      { stage: "scanning", task: "Scanning your website traffic...", duration: 3000, progress: 35 },
      { stage: "analyzing", task: "Analyzing bot patterns with AI...", duration: 4000, progress: 70 },
      { stage: "processing", task: "Processing bandwidth consumption data...", duration: 2500, progress: 95 },
      { stage: "complete", task: "Analysis complete!", duration: 1500, progress: 100 },
    ]

    let currentStageIndex = 0

    const progressStage = () => {
      if (currentStageIndex < stages.length) {
        const currentStageData = stages[currentStageIndex]
        setStage(currentStageData.stage as any)
        setCurrentTask(currentStageData.task)

        // Animate progress bar
        const startProgress = currentStageIndex === 0 ? 0 : stages[currentStageIndex - 1].progress
        const endProgress = currentStageData.progress
        const duration = currentStageData.duration
        const steps = 50
        const stepDuration = duration / steps
        const progressStep = (endProgress - startProgress) / steps

        let currentProgress = startProgress
        const progressInterval = setInterval(() => {
          currentProgress += progressStep
          setProgress(Math.min(currentProgress, endProgress))

          if (currentProgress >= endProgress) {
            clearInterval(progressInterval)
          }
        }, stepDuration)

        setTimeout(() => {
          currentStageIndex++
          if (currentStageIndex < stages.length) {
            progressStage()
          } else {
            // Analysis complete, redirect to dashboard
            setTimeout(() => {
              router.push("/dashboard")
            }, 1000)
          }
        }, duration)
      }
    }

    progressStage()
  }, [router])

  const getStageIcon = () => {
    switch (stage) {
      case "initializing":
        return "🤖"
      case "scanning":
        return "🔍"
      case "analyzing":
        return "🧠"
      case "processing":
        return "⚡"
      case "complete":
        return "✅"
      default:
        return "🤖"
    }
  }

  const getAnimationClass = () => {
    switch (stage) {
      case "scanning":
        return "animate-pulse"
      case "analyzing":
        return "animate-bounce"
      case "processing":
        return "animate-spin"
      default:
        return "animate-pulse"
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.05)_1px,transparent_1px)] bg-[size:40px_40px] animate-pulse" />
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-gradient-to-tl from-green-400/15 via-green-500/8 to-transparent rounded-full blur-3xl animate-pulse" />

        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-green-400/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
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

      <div className="relative flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="max-w-2xl mx-auto text-center px-8">
          {/* Main AI Icon */}
          <div className="mb-8">
            <div className={`text-8xl mb-4 ${getAnimationClass()}`}>{getStageIcon()}</div>
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400/20 to-green-600/20 rounded-full flex items-center justify-center backdrop-blur-xl border border-green-500/30">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-2xl font-bold text-white">AI</span>
              </div>
            </div>
          </div>

          {/* Status Text */}
          <div className="space-y-4 mb-12">
            <h1 className="text-4xl font-bold text-white mb-2">Hoxi AI is analyzing your site</h1>
            <p className="text-xl text-gray-400">{currentTask}</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-4 mb-8">
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-300 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Analyzing traffic patterns</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Analysis Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
            <div
              className={`p-4 rounded-lg border transition-all duration-300 ${
                ["initializing", "scanning", "analyzing", "processing", "complete"].indexOf(stage) >= 0
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-gray-800/40 border-gray-700 text-gray-500"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    ["initializing", "scanning", "analyzing", "processing", "complete"].indexOf(stage) >= 0
                      ? "bg-green-400 animate-pulse"
                      : "bg-gray-600"
                  }`}
                />
                <span className="text-sm font-medium">Traffic Analysis</span>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg border transition-all duration-300 ${
                ["scanning", "analyzing", "processing", "complete"].indexOf(stage) >= 0
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-gray-800/40 border-gray-700 text-gray-500"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    ["scanning", "analyzing", "processing", "complete"].indexOf(stage) >= 0
                      ? "bg-green-400 animate-pulse"
                      : "bg-gray-600"
                  }`}
                />
                <span className="text-sm font-medium">Bot Detection</span>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg border transition-all duration-300 ${
                ["analyzing", "processing", "complete"].indexOf(stage) >= 0
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-gray-800/40 border-gray-700 text-gray-500"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    ["analyzing", "processing", "complete"].indexOf(stage) >= 0
                      ? "bg-green-400 animate-pulse"
                      : "bg-gray-600"
                  }`}
                />
                <span className="text-sm font-medium">Cost Calculation</span>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg border transition-all duration-300 ${
                ["complete"].indexOf(stage) >= 0
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-gray-800/40 border-gray-700 text-gray-500"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    ["complete"].indexOf(stage) >= 0 ? "bg-green-400 animate-pulse" : "bg-gray-600"
                  }`}
                />
                <span className="text-sm font-medium">Report Generation</span>
              </div>
            </div>
          </div>

          {/* Fun Facts */}
          <div className="mt-12 p-6 bg-gray-900/40 border border-gray-700 rounded-lg backdrop-blur-xl">
            <p className="text-sm text-gray-400 mb-2">💡 Did you know?</p>
            <p className="text-gray-300">
              {stage === "initializing" &&
                "AI bots can consume up to 60% of your website's bandwidth without you knowing it."}
              {stage === "scanning" &&
                "Our AI analyzes over 50 different bot behavior patterns to identify malicious traffic."}
              {stage === "analyzing" &&
                "Machine learning helps us distinguish between good bots (like search engines) and bad bots."}
              {stage === "processing" &&
                "We calculate real-time costs based on your hosting provider's bandwidth pricing."}
              {stage === "complete" && "You're about to see exactly how much money bots are costing you every month."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
