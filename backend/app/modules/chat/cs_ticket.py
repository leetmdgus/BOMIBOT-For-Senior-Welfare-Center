"""CS ticket email (parity with frontend lib/chat/cs-ticket.ts)."""

from __future__ import annotations

import logging
import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from app.common.core.config import Settings

logger = logging.getLogger(__name__)


def is_cs_email_configured(settings: Settings) -> bool:
    return bool(settings.smtp_user and settings.smtp_pass)


def process_cs_ticket(settings: Settings, payload: dict[str, Any]) -> dict[str, Any]:
    ticket_id = f"CS-{uuid.uuid4().hex[:8].upper()}"

    if not is_cs_email_configured(settings):
        logger.error("[CS Ticket] SMTP not configured")
        return {
            "ticketId": ticket_id,
            "emailSent": False,
            "sentTo": "",
            "message": (
                "문의 내용은 접수되었으나 메일 서버(SMTP)가 설정되지 않아 "
                "이메일을 보내지 못했습니다. 관리자에게 SMTP 설정을 요청해 주세요."
            ),
        }

    sent_to = settings.cs_email_to or settings.smtp_user or ""
    subject = f"[봄이봇 CS] {payload.get('subject') or '고객 문의'} ({ticket_id})"
    body_lines = [
        f"티켓: {ticket_id}",
        f"이름: {payload.get('name', '')}",
        f"이메일: {payload.get('email', '')}",
        "",
        payload.get("message", ""),
    ]
    if payload.get("pageUrl"):
        body_lines.extend(["", f"페이지: {payload['pageUrl']}"])

    msg = MIMEMultipart()
    msg["From"] = settings.smtp_user
    msg["To"] = sent_to
    msg["Subject"] = subject
    msg.attach(MIMEText("\n".join(body_lines), "plain", "utf-8"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_pass)
            server.sendmail(settings.smtp_user, [sent_to], msg.as_string())
        return {
            "ticketId": ticket_id,
            "emailSent": True,
            "sentTo": sent_to,
            "message": f"{sent_to}로 접수 메일을 발송했습니다. 티켓 번호: {ticket_id}",
        }
    except Exception as exc:
        logger.exception("[CS Ticket] email failed")
        detail = str(exc)
        raise RuntimeError(
            f"메일 발송에 실패했습니다. Gmail 앱 비밀번호·SMTP 설정을 확인해 주세요. ({detail})"
        ) from exc
