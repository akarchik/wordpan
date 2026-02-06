import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { toast } from 'sonner'

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000'

type WordPair = Database['public']['Tables']['word_pairs']['Row']
type WordPairInsert = Database['public']['Tables']['word_pairs']['Insert']
type WordPairUpdate = Database['public']['Tables']['word_pairs']['Update']

interface WordPairsResponse {
  data: WordPair[]
  count: number
  page: number
  limit: number
}

interface UseWordPairsState {
  pairs: WordPair[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
  }
}

/**
 * Helper function to make authenticated API requests to AI service
 */
async function makeAuthenticatedRequest<T>(
  method: string,
  endpoint: string,
  body?: any
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated')
  }

  const response = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    ...(body && { body: JSON.stringify(body) }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Request failed: ${response.statusText}`)
  }

  return response.json()
}

export function useWordPairs() {
  const [state, setState] = useState<UseWordPairsState>({
    pairs: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
    },
  })

  // Fetch all word pairs with pagination
  const fetchWordPairs = useCallback(
    async (page: number = 1, limit: number = 20) => {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const response = await makeAuthenticatedRequest<WordPairsResponse>(
          'GET',
          `/api/word-pairs?page=${page}&limit=${limit}`
        )

        setState((prev) => ({
          ...prev,
          pairs: response.data,
          loading: false,
          pagination: {
            page: response.page,
            limit: response.limit,
            total: response.count,
          },
        }))
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to fetch word pairs'
        setState((prev) => ({ ...prev, error, loading: false }))
      }
    },
    []
  )

  // Create new word pair
  const createWordPair = useCallback(
    async (
      word1: string,
      word2: string,
      pairType: 'synonym' | 'antonym' | 'translation' | 'related' | 'custom' = 'custom',
      description?: string
    ) => {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const payload: WordPairInsert = {
          word1: word1.trim(),
          word2: word2.trim(),
          pair_type: pairType,
          description: description?.trim() || null,
          user_id: '', // Will be set by backend with auth context
        }

        const newPair = await makeAuthenticatedRequest<WordPair>(
          'POST',
          '/api/word-pairs',
          payload
        )

        setState((prev) => ({
          ...prev,
          pairs: [newPair, ...prev.pairs],
          loading: false,
          pagination: { ...prev.pagination, total: prev.pagination.total + 1 },
        }))

        return newPair
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to create word pair'
        setState((prev) => ({ ...prev, error, loading: false }))
        throw err
      }
    },
    []
  )

  // Update existing word pair
  const updateWordPair = useCallback(
    async (pairId: string, updates: Partial<Omit<WordPairUpdate, 'user_id'>>) => {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const updatePayload: Record<string, unknown> = {}

        if (updates.word1) updatePayload.word1 = updates.word1.trim()
        if (updates.word2) updatePayload.word2 = updates.word2.trim()
        if (updates.pair_type) updatePayload.pair_type = updates.pair_type
        if ('description' in updates)
          updatePayload.description = updates.description?.trim() || null

        const updatedPair = await makeAuthenticatedRequest<WordPair>(
          'PUT',
          `/api/word-pairs/${pairId}`,
          updatePayload
        )

        setState((prev) => ({
          ...prev,
          pairs: prev.pairs.map((p) => (p.id === pairId ? updatedPair : p)),
          loading: false,
        }))

        return updatedPair
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to update word pair'
        setState((prev) => ({ ...prev, error, loading: false }))
        throw err
      }
    },
    []
  )

  // Delete word pair
  const deleteWordPair = useCallback(async (pairId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      await makeAuthenticatedRequest<void>('DELETE', `/api/word-pairs/${pairId}`)

      setState((prev) => ({
        ...prev,
        pairs: prev.pairs.filter((p) => p.id !== pairId),
        loading: false,
        pagination: { ...prev.pagination, total: Math.max(0, prev.pagination.total - 1) },
      }))
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete word pair'
      setState((prev) => ({ ...prev, error, loading: false }))
      throw err
    }
  }, [])

  // Go to next page
  const nextPage = useCallback(() => {
    const maxPage = Math.ceil(state.pagination.total / state.pagination.limit)
    if (state.pagination.page < maxPage) {
      fetchWordPairs(state.pagination.page + 1, state.pagination.limit)
    }
  }, [state.pagination, fetchWordPairs])

  // Go to previous page
  const prevPage = useCallback(() => {
    if (state.pagination.page > 1) {
      fetchWordPairs(state.pagination.page - 1, state.pagination.limit)
    }
  }, [state.pagination, fetchWordPairs])

  return {
    ...state,
    fetchWordPairs,
    createWordPair,
    updateWordPair,
    deleteWordPair,
    nextPage,
    prevPage,
    hasNextPage:
      state.pagination.page < Math.ceil(state.pagination.total / state.pagination.limit),
    hasPrevPage: state.pagination.page > 1,
  }
}
