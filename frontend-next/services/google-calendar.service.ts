import { apiClient, isFastApiMode, resolveApiPath } from "@/lib/api-client"
import type { CalendarEvent } from "./dashboard.types"
import type { GoogleCalendarStatus } from "./auth.types"

export interface GoogleCalendarEventsResponse {
  events: CalendarEvent[]
  connected: boolean
}

export async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  if (!isFastApiMode()) {
    return { connected: false }
  }
  return apiClient.get<GoogleCalendarStatus>(
    resolveApiPath("/api/auth/google/status", "/api/v1/auth/google/status"),
  )
}

export async function getGoogleCalendarConnectUrl(): Promise<string> {
  const { authorizeUrl } = await apiClient.get<{ authorizeUrl: string }>(
    resolveApiPath(
      "/api/auth/google/calendar/connect-url",
      "/api/v1/auth/google/calendar/connect-url",
    ),
  )
  return authorizeUrl
}

export async function fetchGoogleCalendarEvents(
  year: number,
  month: number,
): Promise<GoogleCalendarEventsResponse> {
  if (!isFastApiMode()) {
    return { events: [], connected: false }
  }
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  })
  return apiClient.get<GoogleCalendarEventsResponse>(
    `${resolveApiPath(
      "/api/auth/google/calendar/events",
      "/api/v1/auth/google/calendar/events",
    )}?${params.toString()}`,
  )
}
