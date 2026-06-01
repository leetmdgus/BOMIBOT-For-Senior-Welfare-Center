"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { buildCollaborationWsUrl, isCollaborationAvailable } from "./ws-url"
import type { CollaborationMessage, PresenceMember } from "./types"

type UseCollaborationRoomOptions = {
  enabled?: boolean
  onMessage?: (message: CollaborationMessage) => void
}

export function useCollaborationRoom(
  room: string | null,
  options: UseCollaborationRoomOptions = {},
) {
  const { enabled = true, onMessage } = options
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const [clientId, setClientId] = useState<string | null>(null)
  const [presence, setPresence] = useState<PresenceMember[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttempts = useRef(0)
  const loggedWsFailure = useRef(false)

  const publish = useCallback(
    (message: Omit<CollaborationMessage, "room">) => {
      const socket = wsRef.current
      if (!socket || socket.readyState !== WebSocket.OPEN) return
      socket.send(
        JSON.stringify({
          ...message,
          room,
        }),
      )
    },
    [room],
  )

  const setFocus = useCallback((focus: string | null) => {
    const socket = wsRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify({ type: "presence.focus", focus }))
  }, [])

  useEffect(() => {
    if (!enabled || !room || !isCollaborationAvailable()) {
      setIsConnected(false)
      setPresence([])
      setClientId(null)
      return
    }

    let cancelled = false

    const connect = () => {
      if (!isCollaborationAvailable()) return

      const url = buildCollaborationWsUrl(room)
      if (!url || cancelled) return

      let socket: WebSocket
      try {
        socket = new WebSocket(url)
      } catch {
        return
      }
      wsRef.current = socket

      socket.onopen = () => {
        if (cancelled) return
        reconnectAttempts.current = 0
        loggedWsFailure.current = false
        setIsConnected(true)
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as CollaborationMessage
          if (data.type === "connected") {
            setClientId(data.clientId ?? null)
            setPresence(data.presence ?? [])
            return
          }
          if (
            data.type === "presence.join" ||
            data.type === "presence.leave" ||
            data.type === "presence.update"
          ) {
            if (data.presence) setPresence(data.presence)
          }
          onMessageRef.current?.(data)
        } catch {
          /* ignore malformed */
        }
      }

      socket.onclose = () => {
        setIsConnected(false)
        wsRef.current = null
        if (!cancelled && reconnectAttempts.current < 5) {
          reconnectAttempts.current += 1
          const delay = Math.min(2500 * reconnectAttempts.current, 15000)
          reconnectTimer.current = setTimeout(connect, delay)
        }
      }

      socket.onerror = () => {
        if (
          process.env.NODE_ENV === "development" &&
          !loggedWsFailure.current
        ) {
          loggedWsFailure.current = true
          console.warn(
            "[collaboration] WebSocket 연결 실패 — NEXT_PUBLIC_COLLABORATION_ENABLED=true 및 API(8020) /api/v1/ws 를 확인하세요.",
          )
        }
        try {
          socket.close()
        } catch {
          /* ignore */
        }
      }
    }

    connect()

    const ping = setInterval(() => {
      publish({ type: "pong" })
      const socket = wsRef.current
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "ping" }))
      }
    }, 30000)

    return () => {
      cancelled = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      clearInterval(ping)
      const socket = wsRef.current
      if (socket) {
        socket.onopen = null
        socket.onerror = null
        socket.onclose = null
        if (socket.readyState === WebSocket.OPEN) {
          socket.close()
        }
      }
      wsRef.current = null
      setIsConnected(false)
    }
  }, [enabled, room, publish])

  return {
    clientId,
    presence,
    isConnected,
    publish,
    setFocus,
  }
}

/** 편집 중 초안을 다른 참여자에게 전달 (디바운스, 단일 WS 연결과 함께 사용) */
export function useDebouncedCollaborationDraft(
  publish: (message: Omit<CollaborationMessage, "room">) => void,
  draft: unknown,
  options: {
    enabled?: boolean
    isConnected?: boolean
    debounceMs?: number
  } = {},
) {
  const { enabled = true, isConnected = false, debounceMs = 450 } = options

  useEffect(() => {
    if (!enabled || !isConnected) return
    const timer = setTimeout(() => {
      publish({
        type: "document.draft",
        payload: draft as Record<string, unknown>,
      })
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [draft, debounceMs, enabled, isConnected, publish])
}
