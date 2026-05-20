import { isCsEmailConfigured, sendCsTicketEmail } from "@/lib/chat/cs-email"
import type { CsTicketRequest, CsTicketResponse } from "@/services/chat.types"

export async function processCsTicket(
  payload: CsTicketRequest,
): Promise<CsTicketResponse> {
  const ticketId = `CS-${Date.now().toString(36).toUpperCase()}`

  if (!isCsEmailConfigured()) {
    console.error(
      "[CS Ticket] SMTP 미설정 — .env에 SMTP_USER, SMTP_PASS(앱 비밀번호)를 설정하세요.",
    )
    return {
      ticketId,
      emailSent: false,
      sentTo: "",
      message:
        "문의 내용은 접수되었으나 메일 서버(SMTP)가 설정되지 않아 이메일을 보내지 못했습니다. 관리자에게 SMTP 설정을 요청해 주세요.",
    }
  }

  try {
    const { sentTo } = await sendCsTicketEmail(ticketId, payload)
    return {
      ticketId,
      emailSent: true,
      sentTo,
      message: `${sentTo}로 접수 메일을 발송했습니다. 티켓 번호: ${ticketId}`,
    }
  } catch (error) {
    console.error("[CS Ticket] 메일 발송 실패:", error)
    const detail =
      error instanceof Error ? error.message : "알 수 없는 오류"
    throw new Error(
      `메일 발송에 실패했습니다. Gmail 앱 비밀번호·SMTP 설정을 확인해 주세요. (${detail})`,
    )
  }
}
