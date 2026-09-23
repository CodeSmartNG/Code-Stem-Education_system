// backend/utils/sendEmail.js
const { Resend } = require('resend');

const sendEmail = async (options) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: 'STEM Platform <onboarding@resend.dev>',
      to: options.to,
      subject: options.subject,
      html: options.html
    });

    console.log('✅ Email sent:', result);
    return result;

  } catch (error) {
    console.error('❌ Email error:', error.message);
    throw error;
  }
};

module.exports = sendEmail;
