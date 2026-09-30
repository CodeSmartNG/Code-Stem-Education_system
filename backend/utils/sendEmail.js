// backend/utils/sendEmail.js
const { Resend } = require('resend');

const sendEmail = async (options) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment variables');
    }

    if (!options.to || !options.subject || !options.html) {
      throw new Error('Missing required email fields (to, subject, html)');
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: 'STEM Platform <onboarding@resend.dev>',
      to: options.to,
      subject: options.subject,
      html: options.html
    });

    // ✅ Resend returns { id } on success or { error } on failure
    if (result.error) {
      console.error('❌ Resend error:', result.error);
      throw new Error(result.error.message || 'Failed to send email');
    }

    console.log('✅ Email sent to:', options.to, '| ID:', result.id);
    return result;

  } catch (error) {
    console.error('❌ Email error:', error.message);
    throw error;
  }
};

module.exports = sendEmail;
