import nodemailer from 'nodemailer';

let transporter = null;
let etherealAccount = null;

export async function initEmailService() {
  try {
    // Create a test account with Ethereal (fake SMTP)
    etherealAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: etherealAccount.smtp.host,
      port: etherealAccount.smtp.port,
      secure: etherealAccount.smtp.secure,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });

    console.log('Email service initialized with Ethereal Email');
    console.log(`Ethereal Account: ${etherealAccount.user}`);
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    throw error;
  }
}

export async function sendEmail(to, subject, body) {
  if (!transporter) {
    throw new Error('Email service not initialized');
  }

  try {
    const info = await transporter.sendMail({
      from: etherealAccount.user,
      to,
      subject,
      text: body,
      html: `<p>${body}</p>`,
    });

    // Generate a preview URL (Ethereal specific)
    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log('Email sent successfully');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Preview URL: ${previewUrl}`);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
      response: info.response,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export function getEtherealAccount() {
  return etherealAccount;
}
