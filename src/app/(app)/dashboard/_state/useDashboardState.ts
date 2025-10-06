import { atom } from 'jotai'

export type TimeRange = '1h' | '24h' | '7d' | 'custom'
export type AutoRefresh = 'live' | '30s' | 'off'
export type ChartMode = 'requests' | 'bytes'
export type SavedView = 'live-ops' | 'cost-review' | 'security-sweep' | null

export interface FilterChip {
  id: string
  type: 'ip' | 'ua' | 'path' | 'time'
  label: string
  value: string
}

export interface TimeWindow {
  start: string
  end: string
}

export interface DetailsDrawerState {
  open: boolean
  type: 'anomaly' | 'ip' | 'ua' | 'path' | null
  data: any
}

export interface ChatDrawerState {
  open: boolean
  contextChips: FilterChip[]
  messages: ChatMessage[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  actions?: ChatMessageAction[]
}

export interface ChatMessageAction {
  type: 'copy' | 'insert'
  label: string
}

// Global state atoms
// These will be initialized from Supabase via useOrgAndSite hook
export const orgIdAtom = atom<string | null>(null)
export const siteIdAtom = atom<string | null>(null)
export const timeRangeAtom = atom<TimeRange>('24h')
export const customTimeWindowAtom = atom<TimeWindow | null>(null)
export const autoRefreshAtom = atom<AutoRefresh>('live')
export const chartModeAtom = atom<ChartMode>('requests')
export const savedViewAtom = atom<SavedView>(null)
export const filterChipsAtom = atom<FilterChip[]>([])
export const detailsDrawerAtom = atom<DetailsDrawerState>({
  open: false,
  type: null,
  data: null,
})
export const chatDrawerAtom = atom<ChatDrawerState>({
  open: false,
  contextChips: [],
  messages: [],
})

// Computed time window based on range
export const effectiveTimeWindowAtom = atom((get) => {
  const range = get(timeRangeAtom)
  const custom = get(customTimeWindowAtom)

  if (range === 'custom' && custom) {
    return custom
  }

  const now = new Date()
  const start = new Date(now)

  switch (range) {
    case '1h':
      start.setHours(now.getHours() - 1)
      break
    case '24h':
      start.setHours(now.getHours() - 24)
      break
    case '7d':
      start.setDate(now.getDate() - 7)
      break
  }

  return {
    start: start.toISOString(),
    end: now.toISOString(),
  }
})

// Actions
export const addFilterChipAtom = atom(
  null,
  (get, set, chip: Omit<FilterChip, 'id'>) => {
    const chips = get(filterChipsAtom)
    const newChip: FilterChip = {
      ...chip,
      id: `${chip.type}-${Date.now()}`,
    }
    set(filterChipsAtom, [...chips, newChip])
  }
)

export const removeFilterChipAtom = atom(
  null,
  (get, set, chipId: string) => {
    const chips = get(filterChipsAtom)
    set(filterChipsAtom, chips.filter(c => c.id !== chipId))
  }
)

export const clearFilterChipsAtom = atom(
  null,
  (_get, set) => {
    set(filterChipsAtom, [])
  }
)

export const openDetailsDrawerAtom = atom(
  null,
  (_get, set, payload: { type: DetailsDrawerState['type']; data: any }) => {
    set(detailsDrawerAtom, {
      open: true,
      type: payload.type,
      data: payload.data,
    })
  }
)

export const closeDetailsDrawerAtom = atom(
  null,
  (_get, set) => {
    set(detailsDrawerAtom, {
      open: false,
      type: null,
      data: null,
    })
  }
)

export const openChatDrawerAtom = atom(
  null,
  (get, set, contextChips?: FilterChip[]) => {
    const currentState = get(chatDrawerAtom)
    set(chatDrawerAtom, {
      ...currentState,
      open: true,
      contextChips: contextChips || currentState.contextChips,
    })
  }
)

export const closeChatDrawerAtom = atom(
  null,
  (get, set) => {
    const currentState = get(chatDrawerAtom)
    set(chatDrawerAtom, {
      ...currentState,
      open: false,
    })
  }
)

export const addChatMessageAtom = atom(
  null,
  (get, set, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const currentState = get(chatDrawerAtom)
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }
    set(chatDrawerAtom, {
      ...currentState,
      messages: [...currentState.messages, newMessage],
    })
  }
)

export const applySavedViewAtom = atom(
  null,
  (_get, set, view: SavedView) => {
    set(savedViewAtom, view)
    set(filterChipsAtom, [])

    // Apply preset filters based on view
    switch (view) {
      case 'live-ops':
        set(timeRangeAtom, '1h')
        set(autoRefreshAtom, 'live')
        break
      case 'cost-review':
        set(timeRangeAtom, '24h')
        set(autoRefreshAtom, 'off')
        set(chartModeAtom, 'bytes')
        break
      case 'security-sweep':
        set(timeRangeAtom, '24h')
        set(autoRefreshAtom, '30s')
        break
    }
  }
)
