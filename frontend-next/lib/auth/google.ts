import { isFastApiMode } from "@/lib/api-client"

/** Google Calendar 연동 API 사용 가능 여부 (로그인과 무관) */
export function isGoogleCalendarApiAvailable(): boolean {
  return isFastApiMode()
}

/** @deprecated use isGoogleCalendarApiAvailable */
export const isGoogleAuthAvailable = isGoogleCalendarApiAvailable

export function getGoogleCalendarViewUrl(): string {
  return "https://calendar.google.com/calendar/u/0/r"
}
