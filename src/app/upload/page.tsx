"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileText, CheckCircle, AlertTriangle, ArrowLeft, Zap } from "lucide-react"
import Image from "next/image"
import { createBrowserClient } from "@/lib/supabase"

interface UploadProgress {
  fileName: string
  progress: number
  status: 'uploading' | 'analyzing' | 'complete' | 'error'
  error?: string
}

export default function UploadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [siteId, setSiteId] = useState<string | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...droppedFiles])
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...selectedFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0 || !orgId || !siteId) return

    setUploading(true)
    setError(null)

    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Not authenticated')
      }

      // Process each file
      for (const file of files) {
        setUploadProgress(prev => [...prev, {
          fileName: file.name,
          progress: 0,
          status: 'uploading'
        }])

        try {
          // Step 1: Get presigned URL
          const ext = file.name.split('.').pop() || 'log'
          const presignRes = await fetch('/api/uploads/presign', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              org_id: orgId,
              site_id: siteId,
              ext,
              bytes: file.size,
              provider_hint: searchParams.get('provider') || undefined
            })
          })

          if (!presignRes.ok) {
            const errData = await presignRes.json()
            throw new Error(errData.error || 'Failed to get upload URL')
          }

          const { upload_id, url, token } = await presignRes.json()

          // Step 2: Upload to Supabase Storage
          const uploadRes = await fetch(url, {
            method: 'PUT',
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
              'x-upsert': 'true'
            },
            body: file
          })

          if (!uploadRes.ok) {
            throw new Error('Failed to upload file to storage')
          }

          setUploadProgress(prev => prev.map(p =>
            p.fileName === file.name ? { ...p, progress: 50, status: 'analyzing' } : p
          ))

          setUploading(false)
          setAnalyzing(true)

          // Step 3: Complete upload and trigger analysis
          const completeRes = await fetch('/api/uploads/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ upload_id })
          })

          if (!completeRes.ok) {
            const errData = await completeRes.json()
            throw new Error(errData.error || 'Failed to complete upload')
          }

          const result = await completeRes.json()

          setUploadProgress(prev => prev.map(p =>
            p.fileName === file.name ? { ...p, progress: 100, status: 'complete' } : p
          ))

          // Redirect to dashboard after successful analysis
          setTimeout(() => {
            router.push('/dashboard')
          }, 1500)

        } catch (fileErr: any) {
          setUploadProgress(prev => prev.map(p =>
            p.fileName === file.name ? { ...p, status: 'error', error: fileErr.message } : p
          ))
          throw fileErr
        }
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed')
      setUploading(false)
      setAnalyzing(false)
    }
  }

  // Initialize org and site
  useEffect(() => {
    const initializeOrgAndSite = async () => {
      try {
        const supabase = createBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          // Preserve current URL to redirect back after login
          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
          router.push(`/login?returnTo=${returnUrl}`)
          return
        }

        // Get or create org
        const orgsRes = await fetch('/api/orgs', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })

        if (!orgsRes.ok) {
          throw new Error('Failed to fetch orgs')
        }

        const { orgs } = await orgsRes.json()
        let currentOrgId = orgs[0]?.id

        // Create default org if none exists
        if (!currentOrgId) {
          const createOrgRes = await fetch('/api/orgs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ name: 'My Organization' })
          })

          if (!createOrgRes.ok) {
            throw new Error('Failed to create org')
          }

          const { org } = await createOrgRes.json()
          currentOrgId = org.id
        }

        setOrgId(currentOrgId)

        // Get site from query params or create/fetch default
        const siteParam = searchParams.get('site')
        const domainParam = searchParams.get('domain')

        if (siteParam) {
          setSiteId(siteParam)
        } else {
          // Get or create site
          const sitesRes = await fetch(`/api/sites?org_id=${currentOrgId}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          })

          if (!sitesRes.ok) {
            throw new Error('Failed to fetch sites')
          }

          const { sites } = await sitesRes.json()
          let currentSiteId = sites[0]?.id

          // Create default site if none exists
          if (!currentSiteId) {
            const createSiteRes = await fetch('/api/sites', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                org_id: currentOrgId,
                name: domainParam || 'My Website',
                domain: domainParam || undefined
              })
            })

            if (!createSiteRes.ok) {
              throw new Error('Failed to create site')
            }

            const { site } = await createSiteRes.json()
            currentSiteId = site.id
          }

          setSiteId(currentSiteId)
        }
      } catch (err: any) {
        console.error('Failed to initialize:', err)
        setError(err.message || 'Failed to initialize')
      }
    }

    initializeOrgAndSite()
  }, [searchParams, router])

  // Auto-open file dialog when requested via query (?open=1)
  useEffect(() => {
    const open = searchParams.get("open") || searchParams.get("auto")
    if (open === "1" && orgId && siteId) {
      // Delay to ensure input is mounted
      setTimeout(() => {
        const el = document.getElementById("file-upload") as HTMLInputElement | null
        el?.click()
      }, 50)
    }
  }, [searchParams, orgId, siteId])

  if (analyzing) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse" />
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-green-500/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <Zap className="w-8 h-8 text-green-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">AI Analyzing Your Logs</h2>
            <p className="text-gray-400 text-lg">Processing server logs to detect bot patterns...</p>
            <div className="mt-8 max-w-md mx-auto">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Processing files</span>
                <span>Analyzing patterns</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{ width: "75%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
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
            <Button onClick={() => router.back()} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </nav>

      <div className="relative p-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Alternative Path</span>
              <span>Upload & Analyze</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: "50%" }} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Upload Server Logs</h1>
                <p className="text-gray-400">Let our AI analyze your logs directly</p>
              </div>
            </div>

            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 text-white">Supported Log Formats:</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">Apache Access Logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">Nginx Access Logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">Cloudflare Logs</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">AWS CloudFront</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">Vercel Function Logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">Custom JSON Logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">Generic CSV</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload Area */}
            <Card className="bg-gray-900/40 border-gray-700 backdrop-blur-xl">
              <CardContent className="p-6">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? "border-blue-400 bg-blue-500/10" : "border-gray-600 hover:border-gray-500"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Drop your log files here</h3>
                  <p className="text-gray-400 mb-4">or click to browse files</p>
                  <input
                    type="file"
                    multiple
                    accept=".log,.txt,.json,.csv,.gz"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                    >
                      Browse Files
                    </Button>
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-white mb-3">Selected Files:</h4>
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-400" />
                            <div>
                              <p className="text-sm font-medium text-white">{file.name}</p>
                              <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => removeFile(index)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-red-400"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading || !orgId || !siteId}
              size="lg"
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:transform-none"
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Uploading Files...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Analyze with AI
                </>
              )}
            </Button>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm justify-center bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {files.length === 0 && !error && (
              <div className="flex items-center gap-2 text-amber-400 text-sm justify-center">
                <AlertTriangle className="w-4 h-4" />
                <span>Please select at least one log file to continue</span>
              </div>
            )}

            {!orgId || !siteId ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm justify-center">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                <span>Initializing...</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
