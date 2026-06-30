"""
Email Service Module for WAH4H Hospital Management System
Handles all email operations with spam-proof delivery logic.
"""
import logging
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

# Configure logging
logger = logging.getLogger(__name__)


def send_otp_email(user_email: str, user_firstname: str, otp_code: str) -> bool:
    """
    Send OTP verification email with both HTML and plain text versions.
    
    Args:
        user_email (str): Recipient's email address
        user_firstname (str): User's first name for personalization
        otp_code (str): One-Time Password code (typically 6 digits)
    
    Returns:
        bool: True if email sent successfully, False otherwise
    
    Email Features:
        - Dual format (HTML + Plain Text) for anti-spam compliance
        - Professional medical-grade template
        - Clear security messaging
        - 5-minute expiration notice
    """
    try:
        # Subject line - clear and professional
        subject = "Your WAH4H Login Code"
        
        # Render HTML template with context
        html_content = render_to_string('emails/otp_login.html', {
            'user_firstname': user_firstname,
            'otp_code': otp_code,
        })
        
        # Create plain text version (CRITICAL for spam filters)
        # Many email clients prefer plain text, and some spam filters flag HTML-only emails
        text_content = strip_tags(html_content)
        
        # Format sender with hospital branding
        from_email = f"WAH4H Security <{settings.DEFAULT_FROM_EMAIL}>"
        
        # Create email with plain text as base
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,  # Plain text version (fallback)
            from_email=from_email,
            to=[user_email],
        )
        
        # Attach HTML version as alternative
        email.attach_alternative(html_content, "text/html")
        
        # Send email
        email.send(fail_silently=False)
        
        logger.info(f"OTP email sent successfully to {user_email}")
        return True
        
    except Exception as e:
        # Log error but don't crash the application
        logger.error(f"Failed to send OTP email to {user_email}: {str(e)}", exc_info=True)
        return False


def send_password_reset_email(user_email: str, user_firstname: str, reset_link: str) -> bool:
    """
    Send password reset email (extensible for future use).
    
    Args:
        user_email (str): Recipient's email address
        user_firstname (str): User's first name
        reset_link (str): Password reset URL
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    try:
        subject = "Reset Your WAH4H Password"
        
        # For future implementation
        html_content = f"""
        <html>
            <body>
                <h2>Hello {user_firstname},</h2>
                <p>Click the link below to reset your password:</p>
                <a href="{reset_link}">Reset Password</a>
            </body>
        </html>
        """
        
        text_content = strip_tags(html_content)
        from_email = f"WAH4H Security <{settings.DEFAULT_FROM_EMAIL}>"
        
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[user_email],
        )
        
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)
        
        logger.info(f"Password reset email sent to {user_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user_email}: {str(e)}", exc_info=True)
        return False
