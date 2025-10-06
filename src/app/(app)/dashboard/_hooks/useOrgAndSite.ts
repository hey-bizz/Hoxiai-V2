"use client"

import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { orgIdAtom, siteIdAtom } from '../_state/useDashboardState'
import { createBrowserClient } from '@/lib/supabase'

/**
 * Hook to initialize org and site IDs from the database
 * This replaces the hardcoded mock values with real IDs from Supabase
 */
export function useOrgAndSite() {
  const setOrgId = useSetAtom(orgIdAtom)
  const setSiteId = useSetAtom(siteIdAtom)

  useEffect(() => {
    async function initializeOrgAndSite() {
      try {
        const supabase = createBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          console.warn('[useOrgAndSite] No session, redirecting to login')
          window.location.href = '/login?returnTo=' + encodeURIComponent(window.location.pathname)
          return
        }

        // Get user's orgs
        const { data: userOrgs, error: orgsError } = await supabase
          .from('user_orgs')
          .select('org_id')
          .eq('user_id', session.user.id)
          .limit(1)

        if (orgsError) {
          console.error('[useOrgAndSite] Failed to fetch user orgs:', orgsError)
          return
        }

        let currentOrgId = userOrgs?.[0]?.org_id

        // If no org exists, create one
        if (!currentOrgId) {
          const createOrgRes = await fetch('/api/orgs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ name: 'My Organization' })
          })

          if (createOrgRes.ok) {
            const { org } = await createOrgRes.json()
            currentOrgId = org.id
          } else {
            console.error('[useOrgAndSite] Failed to create org')
            return
          }
        }

        setOrgId(currentOrgId)

        // Get sites for this org
        const { data: sites, error: sitesError } = await supabase
          .from('sites')
          .select('id')
          .eq('org_id', currentOrgId)
          .limit(1)

        if (sitesError) {
          console.error('[useOrgAndSite] Failed to fetch sites:', sitesError)
          return
        }

        let currentSiteId = sites?.[0]?.id

        // If no site exists, create one
        if (!currentSiteId) {
          const createSiteRes = await fetch('/api/sites', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              org_id: currentOrgId,
              name: 'My Website',
              domain: null
            })
          })

          if (createSiteRes.ok) {
            const { site } = await createSiteRes.json()
            currentSiteId = site.id
          } else {
            console.error('[useOrgAndSite] Failed to create site')
            return
          }
        }

        setSiteId(currentSiteId)

        console.log('[useOrgAndSite] Initialized:', { orgId: currentOrgId, siteId: currentSiteId })
      } catch (err) {
        console.error('[useOrgAndSite] Error initializing:', err)
      }
    }

    initializeOrgAndSite()
  }, [setOrgId, setSiteId])
}
