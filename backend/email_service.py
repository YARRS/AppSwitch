import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from timezone_utils import now_ist
import asyncio
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.email_notifications_collection = db.email_notifications
        
        # Email configuration from environment variables
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@vallmark.com")
        self.from_name = os.getenv("FROM_NAME", "Vallmark Gift Articles")
    
    def get_email_template(self, template_type: str, template_data: Dict[str, Any]) -> Dict[str, str]:
        """Get email template based on type"""
        
        templates = {
            "order_shipped": {
                "subject": f"🚚 Your order {template_data.get('order_number')} has been shipped!",
                "html": f"""
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
                            <h1 style="margin: 0; font-size: 28px;">📦 Order Shipped!</h1>
                            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your order is on its way</p>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                            <p style="font-size: 18px; margin-bottom: 20px;">Hello {template_data.get('customer_name', 'Valued Customer')},</p>
                            
                            <p style="font-size: 16px; margin-bottom: 20px;">Great news! Your order has been shipped and is on its way to you.</p>
                            
                            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                                <h3 style="margin-top: 0; color: #667eea;">Order Details</h3>
                                <p><strong>Order Number:</strong> {template_data.get('order_number')}</p>
                                {f"<p><strong>Tracking Number:</strong> {template_data.get('tracking_number')}</p>" if template_data.get('tracking_number') else ""}
                                {f"<p><strong>Expected Delivery:</strong> {template_data.get('expected_delivery_date')}</p>" if template_data.get('expected_delivery_date') else ""}
                            </div>
                            
                            <p style="font-size: 16px; margin-bottom: 30px;">We'll send you another notification once your order has been delivered.</p>
                            
                            <div style="text-align: center;">
                                <a href="https://vallmark.com/track-order" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Track Your Order</a>
                            </div>
                            
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d;">
                                <p>If you have any questions, please contact our support team.</p>
                                <p>Thank you for choosing Vallmark Gift Articles!</p>
                            </div>
                        </div>
                    </div>
                </div>
                """,
                "text": f"""
                Order Shipped - {template_data.get('order_number')}
                
                Hello {template_data.get('customer_name', 'Valued Customer')},
                
                Great news! Your order has been shipped and is on its way to you.
                
                Order Details:
                - Order Number: {template_data.get('order_number')}
                {'- Tracking Number: ' + template_data.get('tracking_number') if template_data.get('tracking_number') else ''}
                {'- Expected Delivery: ' + template_data.get('expected_delivery_date') if template_data.get('expected_delivery_date') else ''}
                
                We'll send you another notification once your order has been delivered.
                
                Thank you for choosing Vallmark Gift Articles!
                """
            },
            
            "order_delivered": {
                "subject": f"✅ Your order {template_data.get('order_number')} has been delivered!",
                "html": f"""
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
                            <h1 style="margin: 0; font-size: 28px;">🎉 Order Delivered!</h1>
                            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your order has arrived</p>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                            <p style="font-size: 18px; margin-bottom: 20px;">Hello {template_data.get('customer_name', 'Valued Customer')},</p>
                            
                            <p style="font-size: 16px; margin-bottom: 20px;">Wonderful! Your order has been successfully delivered.</p>
                            
                            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                                <h3 style="margin-top: 0; color: #28a745;">Order Details</h3>
                                <p><strong>Order Number:</strong> {template_data.get('order_number')}</p>
                                <p><strong>Delivery Date:</strong> {datetime.now().strftime('%B %d, %Y')}</p>
                            </div>
                            
                            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <h3 style="margin-top: 0; color: #0066cc;">Need a Replacement?</h3>
                                <p style="margin-bottom: 15px;">If there's any issue with your order, you can request a replacement within 7 days of delivery.</p>
                                <a href="https://vallmark.com/replacement-request" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">Request Replacement</a>
                            </div>
                            
                            <p style="font-size: 16px; margin-bottom: 30px;">We hope you love your purchase! Please consider leaving a review to help other customers.</p>
                            
                            <div style="text-align: center;">
                                <a href="https://vallmark.com/orders" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 10px;">View Order</a>
                                <a href="https://vallmark.com" style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Shop Again</a>
                            </div>
                            
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d;">
                                <p>Thank you for choosing Vallmark Gift Articles!</p>
                                <p>We appreciate your business and look forward to serving you again.</p>
                            </div>
                        </div>
                    </div>
                </div>
                """,
                "text": f"""
                Order Delivered - {template_data.get('order_number')}
                
                Hello {template_data.get('customer_name', 'Valued Customer')},
                
                Wonderful! Your order has been successfully delivered.
                
                Order Details:
                - Order Number: {template_data.get('order_number')}
                - Delivery Date: {datetime.now().strftime('%B %d, %Y')}
                
                Need a Replacement?
                If there's any issue with your order, you can request a replacement within 7 days of delivery.
                
                We hope you love your purchase! Please consider leaving a review to help other customers.
                
                Thank you for choosing Vallmark Gift Articles!
                """
            },
            
            "note_added": {
                "subject": f"📝 Update on your order {template_data.get('order_number')}",
                "html": f"""
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
                            <h1 style="margin: 0; font-size: 28px;">📝 Order Update</h1>
                            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Important information about your order</p>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                            <p style="font-size: 18px; margin-bottom: 20px;">Hello {template_data.get('customer_name', 'Valued Customer')},</p>
                            
                            <p style="font-size: 16px; margin-bottom: 20px;">We have an important update regarding your order.</p>
                            
                            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6f42c1;">
                                <h3 style="margin-top: 0; color: #6f42c1;">Order Details</h3>
                                <p><strong>Order Number:</strong> {template_data.get('order_number')}</p>
                                <p><strong>Update from:</strong> {template_data.get('admin_name', 'Our Team')}</p>
                            </div>
                            
                            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
                                <h3 style="margin-top: 0; color: #856404;">Message</h3>
                                <p style="margin-bottom: 0; font-size: 16px;">{template_data.get('note', 'Important update about your order.')}</p>
                            </div>
                            
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://vallmark.com/track-order" style="background: #6f42c1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Order Details</a>
                            </div>
                            
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d;">
                                <p>If you have any questions, please don't hesitate to contact our support team.</p>
                                <p>Thank you for choosing Vallmark Gift Articles!</p>
                            </div>
                        </div>
                    </div>
                </div>
                """,
                "text": f"""
                Order Update - {template_data.get('order_number')}
                
                Hello {template_data.get('customer_name', 'Valued Customer')},
                
                We have an important update regarding your order.
                
                Order Details:
                - Order Number: {template_data.get('order_number')}
                - Update from: {template_data.get('admin_name', 'Our Team')}
                
                Message:
                {template_data.get('note', 'Important update about your order.')}
                
                If you have any questions, please don't hesitate to contact our support team.
                
                Thank you for choosing Vallmark Gift Articles!
                """
            }
        }
        
        return templates.get(template_type, templates["note_added"])
    
    async def send_email(self, to_email: str, to_name: str, subject: str, html_content: str, text_content: str = None) -> bool:
        """Send email using SMTP"""
        
        try:
            # Check if SMTP is configured
            if not self.smtp_username or not self.smtp_password:
                logger.warning("SMTP not configured. Email not sent.")
                return False
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = f"{to_name} <{to_email}>"
            
            # Add text and HTML parts
            if text_content:
                text_part = MIMEText(text_content, 'plain')
                msg.attach(text_part)
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    async def process_email_queue(self):
        """Process pending email notifications"""
        
        try:
            # Get pending emails
            pending_emails = await self.email_notifications_collection.find(
                {"status": "pending", "retry_count": {"$lt": 3}}
            ).limit(10).to_list(length=10)
            
            for email_doc in pending_emails:
                try:
                    # Get email template
                    template = self.get_email_template(
                        email_doc["template_type"], 
                        email_doc["template_data"]
                    )
                    
                    # Send email
                    success = await self.send_email(
                        email_doc["recipient_email"],
                        email_doc["recipient_name"],
                        template["subject"],
                        template["html"],
                        template.get("text")
                    )
                    
                    # Update status
                    if success:
                        await self.email_notifications_collection.update_one(
                            {"id": email_doc["id"]},
                            {"$set": {
                                "status": "sent",
                                "sent_at": now_ist(),
                                "updated_at": now_ist()
                            }}
                        )
                    else:
                        await self.email_notifications_collection.update_one(
                            {"id": email_doc["id"]},
                            {"$set": {
                                "status": "failed",
                                "retry_count": email_doc.get("retry_count", 0) + 1,
                                "error_message": "Failed to send email",
                                "updated_at": now_ist()
                            }}
                        )
                
                except Exception as e:
                    logger.error(f"Error processing email {email_doc['id']}: {str(e)}")
                    await self.email_notifications_collection.update_one(
                        {"id": email_doc["id"]},
                        {"$set": {
                            "status": "failed",
                            "retry_count": email_doc.get("retry_count", 0) + 1,
                            "error_message": str(e),
                            "updated_at": now_ist()
                        }}
                    )
        
        except Exception as e:
            logger.error(f"Error processing email queue: {str(e)}")
    
    async def start_email_processor(self):
        """Start background email processor"""
        while True:
            await self.process_email_queue()
            await asyncio.sleep(30)  # Process every 30 seconds

# Background task function
async def start_email_service(db: AsyncIOMotorDatabase):
    """Start email service background task"""
    email_service = EmailService(db)
    await email_service.start_email_processor()