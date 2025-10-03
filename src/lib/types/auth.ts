export type Org = {
  id: string
  name: string
  created_by: string
  created_at: string
}

export type Site = {
  id: string
  org_id: string
  name: string
  domain?: string | null
  created_at: string
}

export type SessionUser = { id: string; email?: string | null }

export type CreateOrgBody = { name: string }
export type CreateSiteBody = { org_id: string; name: string; domain?: string }

