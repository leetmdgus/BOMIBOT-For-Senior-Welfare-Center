import type { ChatConfig, CsTicketRequest, CsTicketResponse } from "@/services/chat.types"

export const chatConfigMock: ChatConfig = {
  mode: "cs",
  welcomeMessage:
    "안녕하세요, 봄이봇 고객지원입니다. 이슈 내용을 자세히 적어 주시고, 화면 캡처·오류 영상(동영상)도 첨부해 주시면 담당자가 이메일로 도와드릴게요.",
  placeholderReply:
    "문의가 접수되었습니다. 담당 CS팀이 확인 후 이메일로 답변드리겠습니다.",
  inputPlaceholder:
    "이슈 내용을 입력하세요. (Shift+Enter 줄바꿈, Enter 전송)",
  csEmail: "bomi20260413@gmail.com",
  maxAttachments: 5,
  maxMessageLength: 5000,
  maxImageSizeMb: 10,
  maxVideoSizeMb: 100,
  suggestions: [
    {
      id: "s1",
      text: "화면에 오류가 나요. 캡처 첨부할게요.",
      icon: "alert",
    },
    {
      id: "s2",
      text: "기능 사용 방법이 궁금합니다.",
      icon: "help",
    },
    {
      id: "s3",
      text: "실적/예산 데이터가 맞지 않아요.",
      icon: "search",
    },
    {
      id: "s4",
      text: "로그인·권한 관련 문의입니다.",
      icon: "fileText",
    },
  ],
}

export async function submitCsTicketMock(
  payload: CsTicketRequest,
): Promise<CsTicketResponse> {
  const ticketId = `CS-${Date.now().toString(36).toUpperCase()}`

  if (process.env.NODE_ENV === "development") {
    console.info("[CS Ticket → Email]", {
      to: chatConfigMock.csEmail,
      ticketId,
      pageUrl: payload.pageUrl,
      contactEmail: payload.contactEmail,
      message: payload.message,
      attachmentCount: payload.attachments.length,
    })
  }

  return {
    ticketId,
    emailSent: true,
    sentTo: chatConfigMock.csEmail,
    message: `${chatConfigMock.csEmail}로 접수되었습니다. 티켓 번호: ${ticketId}`,
  }
}
