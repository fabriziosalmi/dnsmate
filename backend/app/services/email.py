"""Email service for password reset and verification"""

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Email service for sending notifications"""
    
    def __init__(self):
        self.smtp_server = getattr(settings, 'smtp_server', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'smtp_port', 587)
        self.smtp_username = getattr(settings, 'smtp_username', '')
        self.smtp_password = getattr(settings, 'smtp_password', '')
        self.from_email = getattr(settings, 'from_email', 'noreply@dnsmate.com')
        self.from_name = getattr(settings, 'from_name', 'DNSMate')
        self.enabled = getattr(settings, 'email_enabled', False)
        
        self.executor = ThreadPoolExecutor(max_workers=2)
    
    def _send_email_sync(self, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None):
        """Send email synchronously"""
        if not self.enabled:
            logger.info(f"Email service disabled. Would send email to {to_email}: {subject}")
            return
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            
            # Add text content
            if text_content:
                text_part = MIMEText(text_content, "plain")
                message.attach(text_part)
            
            # Add HTML content
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            # Create SSL context
            context = ssl.create_default_context()
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_username, self.smtp_password)
                server.sendmail(self.from_email, to_email, message.as_string())
            
            logger.info(f"Email sent successfully to {to_email}")
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            raise
    
    async def send_email(self, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None):
        """Send email asynchronously"""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            self.executor,
            self._send_email_sync,
            to_email,
            subject,
            html_content,
            text_content
        )
    
    async def send_password_reset_email(self, email: str, token: str, user_name: Optional[str] = None):
        """Send password reset email"""
        reset_url = f"{getattr(settings, 'frontend_url', 'http://localhost:3000')}/reset-password?token={token}"
        
        name = user_name or email.split('@')[0]
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Password Reset - DNSMate</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #2563eb; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9fafb; }}
                .button {{ display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .warning {{ background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; color: #6b7280; font-size: 14px; padding: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>DNSMate</h1>
                    <p>Password Reset Request</p>
                </div>
                <div class="content">
                    <h2>Hello {name},</h2>
                    <p>We received a request to reset your password for your DNSMate account. If you made this request, click the button below to reset your password:</p>
                    
                    <div style="text-align: center;">
                        <a href="{reset_url}" class="button">Reset Password</a>
                    </div>
                    
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
                        {reset_url}
                    </p>
                    
                    <div class="warning">
                        <strong>Security Notice:</strong>
                        <ul>
                            <li>This link will expire in 1 hour for security reasons</li>
                            <li>If you didn't request this reset, please ignore this email</li>
                            <li>Never share this link with anyone</li>
                        </ul>
                    </div>
                    
                    <p>If you continue to have problems, please contact our support team.</p>
                </div>
                <div class="footer">
                    <p>This email was sent by DNSMate at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        DNSMate - Password Reset Request
        
        Hello {name},
        
        We received a request to reset your password for your DNSMate account.
        
        To reset your password, visit: {reset_url}
        
        This link will expire in 1 hour for security reasons.
        
        If you didn't request this reset, please ignore this email.
        
        Best regards,
        DNSMate Team
        """
        
        await self.send_email(
            to_email=email,
            subject="Reset your DNSMate password",
            html_content=html_content,
            text_content=text_content
        )
    
    async def send_verification_email(self, email: str, token: str, user_name: Optional[str] = None):
        """Send email verification email"""
        verify_url = f"{getattr(settings, 'frontend_url', 'http://localhost:3000')}/verify-email?token={token}"
        
        name = user_name or email.split('@')[0]
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Email Verification - DNSMate</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #059669; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9fafb; }}
                .button {{ display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .info {{ background-color: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; color: #6b7280; font-size: 14px; padding: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>DNSMate</h1>
                    <p>Welcome! Please verify your email</p>
                </div>
                <div class="content">
                    <h2>Hello {name},</h2>
                    <p>Thank you for creating a DNSMate account! To complete your registration and start managing DNS zones, please verify your email address:</p>
                    
                    <div style="text-align: center;">
                        <a href="{verify_url}" class="button">Verify Email Address</a>
                    </div>
                    
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
                        {verify_url}
                    </p>
                    
                    <div class="info">
                        <strong>What's next?</strong>
                        <p>Once verified, you'll be able to:</p>
                        <ul>
                            <li>Manage DNS zones and records</li>
                            <li>Create API tokens for automation</li>
                            <li>Access backup and versioning features</li>
                        </ul>
                    </div>
                    
                    <p>If you didn't create this account, you can safely ignore this email.</p>
                </div>
                <div class="footer">
                    <p>This email was sent by DNSMate at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
                    <p>Need help? Contact our support team.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        DNSMate - Email Verification
        
        Hello {name},
        
        Thank you for creating a DNSMate account!
        
        To complete your registration, please verify your email address by visiting:
        {verify_url}
        
        Once verified, you'll be able to manage DNS zones and records.
        
        If you didn't create this account, you can safely ignore this email.
        
        Best regards,
        DNSMate Team
        """
        
        await self.send_email(
            to_email=email,
            subject="Verify your DNSMate email address",
            html_content=html_content,
            text_content=text_content
        )
    
    async def send_security_alert(self, email: str, event: str, ip_address: str, user_name: Optional[str] = None):
        """Send security alert email"""
        name = user_name or email.split('@')[0]
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Security Alert - DNSMate</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #dc2626; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9fafb; }}
                .alert {{ background-color: #fee2e2; border: 1px solid #dc2626; padding: 15px; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; color: #6b7280; font-size: 14px; padding: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>DNSMate</h1>
                    <p>Security Alert</p>
                </div>
                <div class="content">
                    <h2>Hello {name},</h2>
                    <p>We detected important security activity on your DNSMate account:</p>
                    
                    <div class="alert">
                        <strong>Event:</strong> {event}<br>
                        <strong>IP Address:</strong> {ip_address}<br>
                        <strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC
                    </div>
                    
                    <p><strong>If this was you:</strong> No action is needed.</p>
                    
                    <p><strong>If this wasn't you:</strong></p>
                    <ul>
                        <li>Change your password immediately</li>
                        <li>Review your account activity</li>
                        <li>Check your API tokens</li>
                        <li>Contact our support team</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>This is an automated security notification from DNSMate</p>
                    <p>Never share your login credentials with anyone</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        await self.send_email(
            to_email=email,
            subject=f"DNSMate Security Alert: {event}",
            html_content=html_content
        )


# Global email service instance
email_service = EmailService()
