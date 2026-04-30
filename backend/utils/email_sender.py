"""
Email sender utility.
Sends emails via SMTP (Gmail App Password or SMTP2GO).
Includes fail-safe logging on send errors.
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "")
SENDER_NAME = os.getenv("SENDER_NAME", "RevFlow-Ai Finance Agent")


def send_email(to_address: str, subject: str, body: str) -> dict:
    """
    Send an email via SMTP.
    Returns a dict with success status and any error message.
    """
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured. Email NOT sent.")
        return {
            "success": False,
            "error": "SMTP credentials not configured. Set SMTP_USERNAME and SMTP_PASSWORD in .env",
            "simulated": True,
            "to": to_address,
            "subject": subject,
        }

    try:
        msg = MIMEMultipart()
        msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        msg["To"] = to_address
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_address, msg.as_string())

        logger.info(f"✅ Email sent to {to_address}: {subject}")
        return {"success": True, "to": to_address, "subject": subject}

    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"❌ SMTP Authentication failed: {e}")
        return {"success": False, "error": f"SMTP authentication failed: {str(e)}", "to": to_address}
    except smtplib.SMTPException as e:
        logger.error(f"❌ SMTP Error sending to {to_address}: {e}")
        return {"success": False, "error": f"SMTP error: {str(e)}", "to": to_address}
    except Exception as e:
        logger.error(f"❌ Unexpected email error: {e}")
        return {"success": False, "error": f"Unexpected error: {str(e)}", "to": to_address}
