// backend/utils/sendEmail.js
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    // ✅ Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.BREVO_SMTP_PORT) || 587,
      secure: false, // STARTTLS on port 587
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY
      }
    });

    // ✅ Verify transporter (only in dev)
    if (process.env.NODE_ENV !== 'production') {
      await transporter.verify();
      console.log('✅ SMTP connection verified');
    }

    const fromName = process.env.EMAIL_FROM_NAME || 'STEM Platform';
    const fromEmail = process.env.EMAIL_FROM;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent to:', options.to);
    console.log('   Message ID:', info.messageId);

    return info;

  } catch (error) {
    console.error('❌ Email error:', error.message);
    throw error;
  }
};

module.exports = sendEmail;
