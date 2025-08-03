// Simple test to verify email functionality works
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Testing email configuration...');
  
  try {
    // Create test transporter (same as in production)
    const transporter = nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });

    // Send test email
    const info = await transporter.sendMail({
      from: '"Chef Mike\'s Culinary Classroom" <noreply@chefmike.app>',
      to: 'test@example.com',
      subject: 'Test Email - Chef Mike\'s Culinary Classroom',
      html: `
        <h1>Email Test Successful!</h1>
        <p>This confirms that the email system is working properly.</p>
        <p>Time: ${new Date().toISOString()}</p>
      `,
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    
    return true;
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    return false;
  }
}

testEmail().then(() => {
  console.log('Email test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Email test error:', error);
  process.exit(1);
});