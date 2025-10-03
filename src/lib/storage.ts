import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'logs'

export async function createSignedUpload(storageKey: string) {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(storageKey)
  if (error || !data) throw error || new Error('createSignedUploadUrl failed')
  return data
}

export async function downloadObject(storageKey: string): Promise<Blob> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(storageKey)
  if (error || !data) throw error || new Error('download failed')
  return data
}

