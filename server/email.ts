import nodemailer from 'nodemailer';

// Email service configuration
interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  html: string;
}

// Simple transporter - can be configured for different providers
const createTransporter = () => {
  // For development, we'll use a test account that works out of the box
  // In production, you can configure with Gmail, Outlook, or other providers
  
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Production configuration with real SMTP
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    // Development: Use Ethereal for testing (creates fake SMTP)
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }
};

export async function sendEmail(config: EmailConfig): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: config.from || '"Chef Mike\'s Culinary Classroom" <noreply@chefmike.app>',
      to: config.to,
      subject: config.subject,
      html: config.html,
    };

    const info = await transporter.sendMail(mailOptions);
    
    // In development, log the preview URL
    if (process.env.NODE_ENV === 'development') {
      console.log('Message sent: %s', info.messageId);
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}

export function generateVerificationEmailHtml(firstName: string, verificationUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - Chef Mike's Culinary Classroom</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
        .content { padding: 40px 20px; }
        .button { display: inline-block; padding: 15px 30px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .logo { font-size: 24px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">👨‍🍳 Chef Mike's Culinary Classroom</div>
          <h1>Welcome to our kitchen!</h1>
        </div>
        <div class="content">
          <h2>Hi ${firstName}!</h2>
          <p>Thank you for joining Chef Mike's Culinary Classroom! We're excited to help you on your culinary journey.</p>
          <p>To get started with creating recipes, planning meals, and accessing our AI-powered recommendations, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
          
          <p>This verification link will expire in 24 hours for security reasons.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <h3>What's waiting for you:</h3>
          <ul>
            <li>🍳 <strong>Recipe Management</strong> - Store and organize your favorite recipes</li>
            <li>🤖 <strong>AI Recommendations</strong> - Get personalized recipe suggestions</li>
            <li>📅 <strong>Meal Planning</strong> - Plan your weeks with ease</li>
            <li>🛒 <strong>Smart Shopping Lists</strong> - Generate lists from your meal plans</li>
            <li>📊 <strong>Inventory Tracking</strong> - Keep track of your pantry</li>
          </ul>
          
          <p>If you didn't create an account with us, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>Happy cooking!<br>The Chef Mike's Team</p>
          <p style="font-size: 12px; color: #999;">
            This email was sent to verify your account. If you have any questions, please contact us.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateWelcomeEmailHtml(firstName: string, loginUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Chef Mike's Culinary Classroom!</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
        .content { padding: 40px 20px; }
        .button { display: inline-block; padding: 15px 30px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .logo { font-size: 24px; font-weight: bold; }
        .feature { padding: 15px; margin: 10px 0; background-color: #f8f9fa; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">👨‍🍳 Chef Mike's Culinary Classroom</div>
          <h1>Your account is ready!</h1>
        </div>
        <div class="content">
          <h2>Welcome, ${firstName}! 🎉</h2>
          <p>Your email has been verified and your account is now active. You're ready to start your culinary adventure!</p>
          
          <div style="text-align: center;">
            <a href="${loginUrl}" class="button">Start Cooking</a>
          </div>
          
          <h3>Get the most out of your experience:</h3>
          
          <div class="feature">
            <h4>📝 Complete Your Profile</h4>
            <p>Add your dietary preferences and cooking goals to get personalized recommendations.</p>
          </div>
          
          <div class="feature">
            <h4>🍳 Add Your First Recipe</h4>
            <p>Start building your digital cookbook with your favorite recipes.</p>
          </div>
          
          <div class="feature">
            <h4>🤖 Try AI Recommendations</h4>
            <p>Let our AI suggest recipes based on your preferences and available ingredients.</p>
          </div>
          
          <div class="feature">
            <h4>📅 Plan Your Week</h4>
            <p>Use our meal planner to organize your cooking schedule and generate shopping lists.</p>
          </div>
          
          <p>Need help getting started? Check out our quick start guide or reach out to our support team.</p>
        </div>
        <div class="footer">
          <p>Happy cooking!<br>The Chef Mike's Team</p>
          <p style="font-size: 12px; color: #999;">
            If you need help, just reply to this email or visit our help center.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}