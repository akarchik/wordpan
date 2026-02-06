import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/contexts/UserContext'

interface UseFavoriteWordsReturn {
  favorites: string[]
  loading: boolean
  error: Error | null
  addFavorite: (word: string) => Promise<boolean>
  removeFavorite: (word: string) => Promise<boolean>
  isFavorite: (word: string) => boolean
  fetchFavorites: () => Promise<void>
}

export function useFavoriteWords(): UseFavoriteWordsReturn {
  const { user } = useUser()
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchFavorites = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: supabaseError } = await supabase
        .from('favorite_words')
        .select('word')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (supabaseError) throw supabaseError

      const words = (data || []).map((item: any) => item.word)
      setFavorites(words)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch favorites')
      setError(error)
      console.error('Error fetching favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const addFavorite = async (word: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { error: supabaseError } = await supabase
        .from('favorite_words')
        .insert([
          {
            user_id: user.id,
            word: word.trim().toLowerCase(),
          },
        ])

      if (supabaseError) {
        // Ignore unique constraint violations
        if (supabaseError.code === '23505') {
          setFavorites([...new Set([...favorites, word.trim().toLowerCase()])])
          return true
        }
        throw supabaseError
      }

      setFavorites([...new Set([word.trim().toLowerCase(), ...favorites])])
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add favorite')
      setError(error)
      console.error('Error adding favorite:', error)
      return false
    }
  }

  const removeFavorite = async (word: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { error: supabaseError } = await supabase
        .from('favorite_words')
        .delete()
        .eq('user_id', user.id)
        .eq('word', word.trim().toLowerCase())

      if (supabaseError) throw supabaseError

      setFavorites(favorites.filter((w) => w !== word.trim().toLowerCase()))
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to remove favorite')
      setError(error)
      console.error('Error removing favorite:', error)
      return false
    }
  }

  const isFavorite = (word: string): boolean => {
    return favorites.includes(word.trim().toLowerCase())
  }

  // Fetch favorites on mount
  useEffect(() => {
    if (user) {
      fetchFavorites()
    }
  }, [user])

  return {
    favorites,
    loading,
    error,
    addFavorite,
    removeFavorite,
    isFavorite,
    fetchFavorites,
  }
}
