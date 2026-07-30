const nodemailer = require('nodemailer');

// Brevo SMTP transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS
  }
});

/**
 * Sends an OTP verification email using Brevo HTTP API, with SMTP fallback.
 */
const sendOtpEmail = async (email, otp) => {
  if (process.env.BREVO_API_KEY) {
    try {
      const senderMatch = (process.env.BREVO_SMTP_FROM || '').match(/(?:"?([^"]*)"?\s)?<([^>]+)>/);
      const senderName = senderMatch ? senderMatch[1] : 'Aether Messaging';
      const senderEmail = senderMatch ? senderMatch[2] : 'abdulbasitmoshood6@gmail.com';

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': process.env.BREVO_API_KEY
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail
          },
          to: [
            {
              email: email
            }
          ],
          subject: 'Aether Verification Code',
          htmlContent: `
            <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #0b141a; color: #fff;">
              <h2 style="color: #10b981; text-align: center;">Aether Security</h2>
              <p style="text-align: center;">Enter this verification code on your screen to complete secure linking:</p>
              <div style="background: #1a242d; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #10b981; margin: 20px 0;">
                ${otp}
              </div>
              <p style="font-size: 10px; color: #64748b; text-align: center;">This code will expire in 10 minutes. If you did not request this, please ignore.</p>
            </div>
          `
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Brevo HTTP Email API failed: ${errText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send email via Brevo HTTP API, falling back to SMTP:', error);
    }
  }

  // Fallback to standard SMTP
  const mailOptions = {
    from: process.env.BREVO_SMTP_FROM || '"Aether Messaging" <noreply@aether.io>',
    to: email,
    subject: 'Aether Verification Code',
    text: `Your Aether Verification Code is: ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #0b141a; color: #fff;">
        <h2 style="color: #10b981; text-align: center;">Aether Security</h2>
        <p style="text-align: center;">Enter this verification code on your screen to complete secure linking:</p>
        <div style="background: #1a242d; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #10b981; margin: 20px 0;">
          ${otp}
        </div>
        <p style="font-size: 10px; color: #64748b; text-align: center;">This code will expire in 10 minutes. If you did not request this, please ignore.</p>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};

/**
 * Sends a transactional SMS using Brevo API.
 */
const sendOtpSms = async (phone, otp) => {
  // If no API key is specified, log to console for development verification
  if (!process.env.BREVO_API_KEY) {
    console.log(`[BREVO SIMULATOR] Sending SMS to ${phone} with code: ${otp}`);
    return { message: 'SMS simulated in development mode successfully', code: otp };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: 'Aether',
        recipient: phone,
        content: `Your Aether Web verification code is: ${otp}. Valid for 10 minutes.`,
        type: 'transactional'
      })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Brevo SMS API failed: ${errText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to send SMS via Brevo API:', error);
    // Fall back to console logger in dev
    console.log(`[BREVO FALLBACK] Verification code for ${phone}: ${otp}`);
    return { error: error.message, simulated: true };
  }
};

/**
 * Sends a system announcement email broadcast to user emails.
 */
const sendAnnouncementEmail = async (emails, announcement) => {
  if (!emails || emails.length === 0) return;

  const subject = `[System Announcement] ${announcement.title}`;
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; color: #1e293b;">
      <div style="background: #2563eb; padding: 20px; border-radius: 12px; margin-bottom: 20px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px; font-weight: bold;">📢 System Announcement</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Aether Control Center</p>
      </div>
      <h3 style="color: #0f172a; font-size: 18px; margin-top: 0;">${announcement.title}</h3>
      <div style="background: #f8fafc; padding: 18px; border-left: 4px solid #2563eb; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #334155; margin: 16px 0;">
        ${announcement.message.replace(/\n/g, '<br/>')}
      </div>
      <p style="font-size: 11px; color: #64748b; margin-top: 24px; border-t: 1px solid #f1f5f9; padding-top: 12px;">This announcement was dispatched from the Aether Support Team to your registered email.</p>
    </div>
  `;

  for (const email of emails) {
    try {
      if (process.env.BREVO_API_KEY) {
        const senderMatch = (process.env.BREVO_SMTP_FROM || '').match(/(?:"?([^"]*)"?\s)?<([^>]+)>/);
        const senderName = senderMatch ? senderMatch[1] : 'Aether Support';
        const senderEmail = senderMatch ? senderMatch[2] : 'abdulbasitmoshood6@gmail.com';

        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'api-key': process.env.BREVO_API_KEY
          },
          body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: [{ email }],
            subject,
            htmlContent
          })
        });
      } else {
        await transporter.sendMail({
          from: process.env.BREVO_SMTP_FROM || '"Aether Support" <noreply@aether.io>',
          to: email,
          subject,
          html: htmlContent
        });
      }
      console.log(`[ANNOUNCEMENT EMAIL] Successfully sent broadcast email to ${email}`);
    } catch (err) {
      console.error(`[ANNOUNCEMENT EMAIL FAILED] Could not send to ${email}:`, err.message);
    }
  }
};

module.exports = {
  sendOtpEmail,
  sendOtpSms,
  sendAnnouncementEmail
};
