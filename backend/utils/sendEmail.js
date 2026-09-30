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

    // 🚨 CRITICAL FIX: Check if Resend returned an error object
    // Resend does NOT throw on API errors — it returns { data: null, error: {...} }
    if (result.error) {
      console.error('❌ Resend rejected email:', result.error);
      throw new Error(`Resend error: ${result.error.message}`);
    }

    console.log('✅ Email sent successfully. ID:', result.data?.id);
    return result.data;

  } catch (error) {
    console.error('❌ Email error:', error.message);
    throw error;
  }
};

module.exports = sendEmail;
