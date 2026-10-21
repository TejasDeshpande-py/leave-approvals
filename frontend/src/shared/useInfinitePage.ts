import { useCallback, useEffect, useRef, useState } from 'react'
import type { Page } from './types'

const PAGE_SIZE = 50

export function useInfinitePage<T>(
  loadPage: (offset: number, limit: number) => Promise<Page<T>>,
  resetKey: string | number,
) {
  const [state, setState] = useState(() => ({
    key: resetKey,
    items: [] as T[],
    total: 0,
    loading: true,
    loadingMore: false,
    hasMore: false,
    error: '',
  }))
  const sentinelRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const requestIdRef = useRef(0)
  const loadingMoreRef = useRef(false)
  const pageState = state.key === resetKey ? state : null
  const items = pageState?.items ?? []
  const total = pageState?.total ?? 0
  const loading = pageState?.loading ?? true
  const loadingMore = pageState?.loadingMore ?? false
  const hasMore = pageState?.hasMore ?? false
  const error = pageState?.error ?? ''

  useEffect(() => {
    const requestId = ++requestIdRef.current
    offsetRef.current = 0
    loadingMoreRef.current = false

    loadPage(0, PAGE_SIZE)
      .then((page) => {
        if (requestId !== requestIdRef.current) return
        offsetRef.current = page.items.length
        setState({
          key: resetKey,
          items: page.items,
          total: page.total,
          loading: false,
          loadingMore: false,
          hasMore: page.items.length < page.total,
          error: '',
        })
      })
      .catch((cause: unknown) => {
        if (requestId === requestIdRef.current) {
          setState({
            key: resetKey,
            items: [],
            total: 0,
            loading: false,
            loadingMore: false,
            hasMore: false,
            error: cause instanceof Error ? cause.message : 'Could not load items',
          })
        }
      })

    return () => { requestIdRef.current += 1 }
  }, [loadPage, resetKey])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMoreRef.current) return
    loadingMoreRef.current = true
    const requestId = requestIdRef.current
    const offset = offsetRef.current
    setState((current) => current.key === resetKey
      ? { ...current, loadingMore: true, error: '' }
      : current)
    try {
      const page = await loadPage(offset, PAGE_SIZE)
      if (requestId !== requestIdRef.current) return
      offsetRef.current = offset + page.items.length
      setState((current) => current.key === resetKey
        ? {
          ...current,
          items: [...current.items, ...page.items],
          total: page.total,
          loadingMore: false,
          hasMore: offsetRef.current < page.total,
        }
        : current)
    } catch (cause) {
      if (requestId === requestIdRef.current) {
        setState((current) => current.key === resetKey
          ? {
            ...current,
            loadingMore: false,
            hasMore: false,
            error: cause instanceof Error ? cause.message : 'Could not load more items',
          }
          : current)
      }
    } finally {
      if (requestId === requestIdRef.current) {
        loadingMoreRef.current = false
      }
    }
  }, [hasMore, loadPage, loading, resetKey])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || loading || loadingMore) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadMore()
    }, { rootMargin: '240px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore, loading, loadingMore])

  const setError = useCallback((message: string) => {
    setState((current) => current.key === resetKey ? { ...current, error: message } : current)
  }, [resetKey])

  return { items, total, loading, loadingMore, hasMore, error, setError, sentinelRef }
}
