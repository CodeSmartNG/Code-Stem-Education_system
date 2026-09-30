// backend/utils/sendEmail.js
const { Resend } = require('resend');

const sendEmail = async (options) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set');
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // ⚠️ TEMPORARY: During testing, force all emails to your signup address
    const TEST_MODE = process.env.NODE_ENV !== 'production';
    const actualTo = TEST_MODE 
      ? 'kabiralkasim6@gmail.com'   // ← your Resend signup email
      : options.to;

    const result = await resend.emails.send({
      from: 'STEM Platform <onboarding@resend.dev>',
      to: actualTo,
      subject: options.subject,
      html: options.html
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    console.log('✅ Email sent to:', actualTo);
    return result;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    throw error;
  }
};

module.exports = sendEmail;
