"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, ExternalLink, AlertTriangle, Copy, Clock, Zap, Upload, FileText } from "lucide-react"
import Image from "next/image"

export default function AWSConnect() {
  const router = useRouter()
  const [stage, setStage] = useState<"intro" | "role-creation" | "verification" | "success">("intro")
  const [roleArn, setRoleArn] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const externalId = generateExternalId()

  const ROLE_POLICY = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "logs:DescribeLogGroups",
          "logs:FilterLogEvents",
          "cloudwatch:GetMetricData",
          "cloudwatch:GetMetricStatistics",
        ],
        Resource: "*",
      },
    ],
  }

  const TRUST_POLICY = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          AWS: "arn:aws:iam::123456789:root", // Hoxi's AWS account
        },
        Action: "sts:AssumeRole",
        Condition: {
          StringEquals: {
            "sts:ExternalId": externalId,
          },
        },
      },
    ],
  }

  function generateExternalId(): string {
    return `hoxi-${Math.random().toString(36).substring(2, 15)}`
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const validateAWSRole = async (arn: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // For demo purposes, accept any non-empty ARN
        resolve(arn.length > 0)
      }, 2000)
    })
  }

  const handleRoleValidation = async () => {
    if (!roleArn) {
      setError("Please enter a valid IAM Role ARN")
      return
    }

    setStage("verification")
    setError(null)

    const isValid = await validateAWSRole(roleArn)

    if (isValid) {
      setStage("success")
      setTimeout(() => {
        router.push("/ai-analysis")
      }, 2000)
    } else {
      setError("Invalid Role ARN or insufficient permissions. Please check your role configuration.")
      setStage("role-creation")
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
        <div className="max-w-3xl mx-auto">
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
                  <svg className="w-8 h-8 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.75 12.75h1.5a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5zM12 6a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 0112 6zM12 18a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 0112 18zM3.75 6.75h1.5a.75.75 0 100-1.5h-1.5a.75.75 0 000 1.5zM5.25 18.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 010 1.5zM3 12a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 013 12zM9 3.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zM12.75 12a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0zM9 15.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Connect AWS</h1>
                  <p className="text-gray-400">Secure cross-account access setup</p>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-400">Advanced Setup Required</p>
                    <p className="text-sm text-gray-400 mt-1">
                      AWS requires creating an IAM role. This takes about 2-5 minutes depending on your experience.
                    </p>
                  </div>
                </div>
              </div>

              <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 text-white">Setup Options:</h3>

                  {/* Option 1: CloudFormation Stack (Easiest) */}
                  <div className="mb-4 p-4 border border-green-500/20 bg-green-500/5 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <Zap className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-green-400 mb-1">
                          Option 1: One-Click CloudFormation (Recommended)
                        </h4>
                        <p className="text-sm text-gray-400 mb-3">
                          Deploy our pre-configured CloudFormation stack - takes 30 seconds
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        const cfUrl = `https://console.aws.amazon.com/cloudformation/home#/stacks/create/review?templateURL=https://hoxi-cf-templates.s3.amazonaws.com/iam-role.yaml&stackName=HoxiMonitorRole&param_ExternalId=${externalId}`
                        window.open(cfUrl, "_blank")
                        setStage("verification")
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Deploy CloudFormation Stack
                    </Button>
                  </div>

                  {/* Option 2: Manual Role Creation */}
                  <div className="p-4 border border-gray-600 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-gray-300 mb-1">Option 2: Manual IAM Role Creation</h4>
                        <p className="text-sm text-gray-400 mb-3">
                          Step-by-step guide for creating the IAM role manually
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setStage("role-creation")}
                      variant="outline"
                      className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      Manual Setup Guide
                    </Button>
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
                      <h3 className="font-semibold text-white">Upload Server Logs (Universal)</h3>
                      <p className="text-sm text-gray-400">Works with any provider — CSV/JSONL/CloudFront</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mb-4">
                    Don’t want to configure IAM now? Upload your logs and get analysis immediately.
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

          {stage === "role-creation" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Create IAM Role Manually</h2>

              <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                      <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                        1
                      </span>
                      Open AWS IAM Console
                    </h3>
                    <Button
                      onClick={() => window.open("https://console.aws.amazon.com/iam/home#/roles", "_blank")}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open IAM Console
                    </Button>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                      <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                        2
                      </span>
                      Create Role with Trust Policy
                    </h3>
                    <ol className="text-sm space-y-2 text-gray-400 mb-4">
                      <li>1. Click "Create role"</li>
                      <li>2. Select "AWS account" → "Another AWS account"</li>
                      <li>
                        3. Enter Account ID:{" "}
                        <code className="bg-black px-2 py-1 rounded text-green-400">123456789</code>
                      </li>
                      <li>4. Check "Require external ID"</li>
                      <li>
                        5. Enter External ID:{" "}
                        <code className="bg-black px-2 py-1 rounded text-green-400">{externalId}</code>
                      </li>
                    </ol>

                    <div className="bg-black rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Trust Policy JSON:</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(JSON.stringify(TRUST_POLICY, null, 2), "trust")}
                          className="text-xs"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {copied === "trust" ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                      <pre className="text-xs text-green-400 overflow-x-auto">
                        {JSON.stringify(TRUST_POLICY, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                      <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                        3
                      </span>
                      Add Permissions Policy
                    </h3>
                    <div className="bg-black rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Permissions Policy JSON:</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(JSON.stringify(ROLE_POLICY, null, 2), "policy")}
                          className="text-xs"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {copied === "policy" ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                      <pre className="text-xs text-green-400 overflow-x-auto">
                        {JSON.stringify(ROLE_POLICY, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                      <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                        4
                      </span>
                      Enter Role ARN
                    </h3>
                    <input
                      type="text"
                      placeholder="arn:aws:iam::YOUR_ACCOUNT:role/HoxiMonitorRole"
                      className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none mb-4"
                      value={roleArn}
                      onChange={(e) => setRoleArn(e.target.value)}
                    />

                    {error && (
                      <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{error}</span>
                      </div>
                    )}

                    <Button
                      onClick={handleRoleValidation}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      disabled={!roleArn}
                    >
                      Verify & Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {stage === "verification" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Verify AWS Connection</h2>

              <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
                <CardContent className="p-6">
                  <p className="mb-4 text-gray-300">Enter the Role ARN from your AWS console:</p>

                  <input
                    type="text"
                    placeholder="arn:aws:iam::123456789:role/HoxiMonitorRole"
                    className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg mb-4 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                    value={roleArn}
                    onChange={(e) => setRoleArn(e.target.value)}
                  />

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    onClick={handleRoleValidation}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={!roleArn}
                  >
                    Verify Connection
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {stage === "success" && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">AWS Successfully Connected!</h2>
              <p className="text-gray-400 mt-2">Redirecting to AI analysis...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
