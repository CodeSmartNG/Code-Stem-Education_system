// backend/utils/sendEmail.js
// ✅ Uses Brevo HTTP API (not SMTP) — works on Render free tier

const sendEmail = async (options) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is not set');
    }

    const senderEmail = process.env.EMAIL_FROM || 'noreply@codesmartng.com';
    const senderName = process.env.EMAIL_FROM_NAME || 'CodeSmartNG STEM';

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: StemEducation,
          email: "codesmartng1@gmail.com"
        },
        to: [
          {
            email: options.to
          }
        ],
        subject: options.subject,
        htmlContent: options.html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Brevo API error:', data);
      throw new Error(data.message || 'Failed to send email via Brevo');
    }

    console.log('✅ Email sent to:', options.to, '| Message ID:', data.messageId);
    return data;

  } catch (error) {
    console.error('❌ Email error:', error.message);
    throw error;
  }
};

module.exports = sendEmail;
