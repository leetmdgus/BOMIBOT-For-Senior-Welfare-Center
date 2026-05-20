import nodemailer from "nodemailer"

import type { CsTicketRequest } from "@/services/chat.types"

function getCsRecipient() {
  return (
    process.env.CS_EMAIL_TO?.trim() ||
    process.env.SMTP_TO?.trim() ||
    "bomi20260413@gmail.com"
  )
}

export function isCsEmailConfigured() {
  return Boolean(
    process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim(),
  )
}

function createTransport() {
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  if (!user || !pass) {
    throw new Error("SMTP_USER, SMTP_PASS 환경 변수가 필요합니다.")
  }

  const host = process.env.SMTP_HOST?.trim()
  const port = process.env.SMTP_PORT
    ? Number(process.env.SMTP_PORT)
    : undefined

  if (host) {
    return nodemailer.createTransport({
      host,
      port: port ?? 587,
      secure: port === 465,
      auth: { user, pass },
    })
  }

  return nodemailer.createTransport({
    service: process.env.SMTP_SERVICE?.trim() || "gmail",
    auth: { user, pass },
  })
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s)
  if (!match) return null
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  }
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function sendCsTicketEmail(
  ticketId: string,
  payload: CsTicketRequest,
): Promise<{ sentTo: string }> {
  const sentTo = getCsRecipient()
  const transporter = createTransport()
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER!.trim()

  const attachments = (payload.attachments ?? [])
    .map((file) => {
      const parsed = parseDataUrl(file.dataUrl)
      if (!parsed) return null
      return {
        filename: file.name,
        content: parsed.buffer,
        contentType: file.type || parsed.contentType,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  const htmlBody = `
    <h2>봄이봇 CS 문의 (${escapeHtml(ticketId)})</h2>
    <p><strong>회신 이메일:</strong> ${escapeHtml(payload.contactEmail ?? "(미입력)")}</p>
    <p><strong>페이지:</strong> ${escapeHtml(payload.pageUrl ?? "(없음)")}</p>
    <hr />
    <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(payload.message || "(첨부만 전송)")}</pre>
    <p style="color:#666;font-size:12px">첨부 ${attachments.length}개</p>
  `

  const textBody = [
    `티켓: ${ticketId}`,
    `회신: ${payload.contactEmail ?? "(미입력)"}`,
    `페이지: ${payload.pageUrl ?? "(없음)"}`,
    "",
    payload.message || "(첨부만 전송)",
    "",
    `첨부 ${attachments.length}개`,
  ].join("\n")

  await transporter.sendMail({
    from: `"봄이봇 CS" <${from}>`,
    to: sentTo,
    replyTo: payload.contactEmail?.trim() || undefined,
    subject: `[봄이봇 CS] ${ticketId} — ${(payload.message || "첨부 문의").slice(0, 40)}`,
    text: textBody,
    html: htmlBody,
    attachments,
  })

  return { sentTo }
}
