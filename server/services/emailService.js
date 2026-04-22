const nodemailer = require('nodemailer');



const getMailTransportOptions = () => {

  const authUser = process.env.EMAIL_USER || process.env.EMAIL_FROM;

  const authPass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;

  const host = process.env.EMAIL_HOST;

  const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587;

  const secure = process.env.EMAIL_SECURE === 'true' || port === 465;



  const transportOptions = {

    auth: {

      user: authUser,

      pass: authPass

    }

  };



  if (process.env.EMAIL_SERVICE) {

    transportOptions.service = process.env.EMAIL_SERVICE;

  } else if (host) {

    transportOptions.host = host;

    transportOptions.port = port;

    transportOptions.secure = secure;

    transportOptions.tls = {

      rejectUnauthorized: process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== 'false'

    };

  } else {

    transportOptions.service = 'gmail';

  }



  return transportOptions;

};



// Configure email transporter

const transporter = nodemailer.createTransport(getMailTransportOptions());



let emailTransportReady = false;



// Only verify transporter if we're confident the credentials are real (not placeholders)

const shouldVerifyTransport = () => {

  const user = process.env.EMAIL_USER || process.env.EMAIL_FROM;

  const pass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;

  

  // Don't verify if using placeholder credentials

  if (!user || user.includes('your-email') || 

      !pass || pass.includes('your-') || pass === 'your-app-password') {

    return false;

  }
  return true;
};

// Verify transporter only if credentials look real

if (shouldVerifyTransport()) {

  transporter.verify()

    .then(() => {

      emailTransportReady = true;

      console.log('✅ Email transporter verified successfully');

    })

    .catch((error) => {

      emailTransportReady = false;

      console.warn('⚠️  Email transporter verification failed:');

      console.warn(`   Error: ${error.message.split('\n')[0]}`);

      console.warn('   📝 Running in fallback mode - OTPs/Reset links logged to console');

    });

} else {

  console.log('📝 Email transporter in DEV MODE - OTPs and reset links will appear in console logs');

  emailTransportReady = false;

}



// Fallback to console logging if email credentials not configured

const canSendEmail = () => {

  return emailTransportReady && !!((process.env.EMAIL_USER || process.env.EMAIL_FROM) && (process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS));

};



const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';
const getSenderAddress = () => process.env.EMAIL_USER || process.env.EMAIL_FROM;
const getSenderName = () => process.env.EMAIL_FROM_NAME || 'ReliefLanka';

const getSenderEmail = () => {
  const senderAddress = getSenderAddress();
  if (!senderAddress) {
    return undefined;
  }

  const senderName = getSenderName();
  return `${senderName} <${senderAddress}>`;
};



/**

 * Send OTP to staff member's email

 * @param {string} email - Recipient email

 * @param {string} otp - One-time password

 * @param {string} fullName - Staff member's full name

 */

const sendOTPEmail = async (email, otp, fullName) => {

  try {

    if (!canSendEmail()) {

      console.log(`\n╔════════════════════════════════════════════════════════╗`);

      console.log(`║         🔐 OTP FOR FIRST-TIME LOGIN (DEV MODE)        ║`);

      console.log(`╠════════════════════════════════════════════════════════╣`);

      console.log(`║ Name:  ${fullName.padEnd(52).substring(0, 52)} ║`);

      console.log(`║ Email: ${email.padEnd(52).substring(0, 52)} ║`);

      console.log(`║ OTP:   ${otp.padEnd(52).substring(0, 52)} ║`);

      console.log(`║ Expires in: 15 minutes                               ║`);

      console.log(`╚════════════════════════════════════════════════════════╝\n`);

      return false;

    }



    const mailOptions = {

      from: getSenderEmail(),

      to: email,

      subject: 'Smart Disaster Relief System - First Login OTP',

      html: `

        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">

          <div style="background-color: #1f2937; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center;">

            <h1 style="margin: 0; font-size: 24px;">Smart Disaster Relief System</h1>

          </div>

          <div style="background-color: #f3f4f6; padding: 30px; border-radius: 0 0 5px 5px;">

            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">

              Hello <strong>${fullName}</strong>,

            </p>

            <p style="color: #374151; font-size: 14px; margin-bottom: 20px;">

              Your account has been created in the Smart Disaster Relief System. To complete your first login, please use the following One-Time Password (OTP):

            </p>

            <div style="background-color: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 5px; text-align: center; margin: 30px 0;">

              <p style="margin: 0; font-size: 12px; color: #374151;">Your One-Time Password</p>

              <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 2px;">${otp}</p>

            </div>

            <p style="color: #374151; font-size: 14px; margin-bottom: 10px;">

              <strong>Important:</strong> This OTP will expire in 15 minutes.

            </p>

            <p style="color: #374151; font-size: 14px; margin-bottom: 20px;">

              After logging in with this OTP, you will be required to set a new password for future logins.

            </p>

            <p style="color: #6b7280; font-size: 12px; margin-bottom: 20px; line-height: 1.6;">

              If you did not create this account or have any questions, please contact the system administrator immediately.

            </p>

            <hr style="border: none; border-top: 1px solid #d1d5db; margin: 20px 0;">

            <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">

              Smart Disaster Relief System | Disaster Management

            </p>

          </div>

        </div>

      `

    };



    await transporter.sendMail(mailOptions);

    console.log(`✅ OTP email sent successfully to ${email}`);

    return true;

  } catch (error) {

    console.error('❌ Error sending OTP email:', error.message);

    console.log(`\n⚠️  Email failed, showing OTP in console:`);

    console.log(`\n╔════════════════════════════════════════════════════════╗`);

    console.log(`║         🔐 OTP FOR FIRST-TIME LOGIN (DEV MODE)        ║`);

    console.log(`╠════════════════════════════════════════════════════════╣`);

    console.log(`║ Name:  ${fullName.padEnd(52).substring(0, 52)} ║`);

    console.log(`║ Email: ${email.padEnd(52).substring(0, 52)} ║`);

    console.log(`║ OTP:   ${otp.padEnd(52).substring(0, 52)} ║`);

    console.log(`║ Expires in: 15 minutes                               ║`);

    console.log(`╚════════════════════════════════════════════════════════╝\n`);

    return false;

  }

};



/**

 * Send staff onboarding email with OTP and password setup link

 * @param {string} email - Recipient email

 * @param {string} otp - One-time password

 * @param {string} fullName - Staff member's full name

 * @param {string} setupToken - Password setup token

 */

const sendStaffOnboardingEmail = async (email, otp, fullName, setupToken) => {

  const setupLink = `${getFrontendUrl()}/reset-password/${setupToken}`;

  try {

    if (!canSendEmail()) {

      console.log(`\n╔════════════════════════════════════════════════════════╗`);

      console.log(`║     STAFF ONBOARDING (DEV MODE FALLBACK)             ║`);

      console.log(`╠════════════════════════════════════════════════════════╣`);

      console.log(`║ Name:  ${fullName.padEnd(52).substring(0, 52)} ║`);

      console.log(`║ Email: ${email.padEnd(52).substring(0, 52)} ║`);

      console.log(`║ OTP:   ${otp.padEnd(52).substring(0, 52)} ║`);

      console.log(`║ Link:  ${setupLink.padEnd(52).substring(0, 52)} ║`);

      console.log(`║ OTP expires: 15 min | Link expires: 24 hours         ║`);

      console.log(`╚════════════════════════════════════════════════════════╝\n`);

      return false;

    }



    const mailOptions = {

      from: getSenderEmail(),

      to: email,

      subject: 'Smart Disaster Relief System - Complete Your Account Setup',

      html: `

        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">

          <div style="background-color: #1f2937; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center;">

            <h1 style="margin: 0; font-size: 24px;">Smart Disaster Relief System</h1>

          </div>

          <div style="background-color: #f3f4f6; padding: 30px; border-radius: 0 0 5px 5px;">

            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">

              Hello <strong>${fullName}</strong>,

            </p>

            <p style="color: #374151; font-size: 14px; margin-bottom: 20px;">

              Your account was created by the administrator. For security reasons, only you can set your password.

            </p>

            <div style="background-color: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">

              <p style="margin: 0; font-size: 12px; color: #374151;">Your OTP</p>

              <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 2px;">${otp}</p>

            </div>

            <div style="text-align: center; margin: 22px 0 30px 0;">

              <a href="${setupLink}" style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">

                Set Password

              </a>

            </div>

            <p style="color: #374151; font-size: 13px; margin-bottom: 8px;">

              If the button does not work, copy this link:

            </p>

            <p style="color: #1d4ed8; font-size: 12px; word-break: break-all; margin-top: 0;">

              ${setupLink}

            </p>

          </div>

        </div>

      `

    };



    await transporter.sendMail(mailOptions);

    console.log(`✅ Staff onboarding email sent successfully to ${email}`);

    return true;

  } catch (error) {

    console.error('❌ Error sending staff onboarding email:', error.message);

    console.log(`\n⚠️  Onboarding email failed, fallback details:`);

    console.log(`OTP: ${otp}`);

    console.log(`Setup Link: ${setupLink}`);

    return false;

  }

};



/**

 * Send password reset link

 * @param {string} email - Recipient email

 * @param {string} resetToken - Password reset token

 * @param {string} fullName - User's full name

 */

const sendPasswordResetEmail = async (email, resetToken, fullName) => {

  try {

    if (!canSendEmail()) {

      const resetLink = `${getFrontendUrl()}/reset-password/${resetToken}`;

      console.log(`\n╔════════════════════════════════════════════════════════╗`);

      console.log(`║      🔑 PASSWORD RESET LINK (DEV MODE)                ║`);

      console.log(`╠════════════════════════════════════════════════════════╣`);

      console.log(`║ Name:  ${fullName.padEnd(52).substring(0, 52)} ║`);

      console.log(`║ Email: ${email.padEnd(52).substring(0, 52)} ║`);

      console.log(`║ Link:  ${resetLink.padEnd(52).substring(0, 52)} ║`);

      console.log(`║ Token: ${resetToken.padEnd(52).substring(0, 52)} ║`);

      console.log(`║ Expires in: 1 hour                                   ║`);

      console.log(`╚════════════════════════════════════════════════════════╝\n`);

      return false;

    }



    const resetLink = `${getFrontendUrl()}/reset-password/${resetToken}`;



    const mailOptions = {

      from: getSenderEmail(),

      to: email,

      subject: 'Smart Disaster Relief System - Password Reset Request',

      html: `

        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">

          <div style="background-color: #1f2937; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center;">

            <h1 style="margin: 0; font-size: 24px;">Smart Disaster Relief System</h1>

          </div>

          <div style="background-color: #f3f4f6; padding: 30px; border-radius: 0 0 5px 5px;">

            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">

              Hello <strong>${fullName}</strong>,

            </p>

            <p style="color: #374151; font-size: 14px; margin-bottom: 20px;">

              We received a request to reset your password for the Smart Disaster Relief System. Click the button below to reset your password:

            </p>

            <div style="text-align: center; margin: 30px 0;">

              <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">

                Reset Password

              </a>

            </div>

            <p style="color: #374151; font-size: 14px; margin-bottom: 20px;">

              <strong>Or copy and paste this link in your browser:</strong><br>

              <span style="color: #3b82f6; word-break: break-all; font-size: 12px;">${resetLink}</span>

            </p>

            <p style="color: #374151; font-size: 14px; margin-bottom: 10px;">

              <strong>Important:</strong> This link will expire in 1 hour.

            </p>

            <p style="color: #6b7280; font-size: 12px; margin-bottom: 20px; line-height: 1.6;">

              If you did not request this password reset, please ignore this email or contact the system administrator.

            </p>

            <hr style="border: none; border-top: 1px solid #d1d5db; margin: 20px 0;">

            <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">

              Smart Disaster Relief System | Disaster Management

            </p>

          </div>

        </div>

      `

    };



    await transporter.sendMail(mailOptions);

    console.log(`✅ Password reset email sent successfully to ${email}`);

    return true;

  } catch (error) {

    console.error('❌ Error sending password reset email:', error.message);

    const resetLink = `${getFrontendUrl()}/reset-password/${resetToken}`;

    console.log(`\n⚠️  Email failed, showing reset link in console:`);

    console.log(`\n╔════════════════════════════════════════════════════════╗`);

    console.log(`║      🔑 PASSWORD RESET LINK (DEV MODE)                ║`);

    console.log(`╠════════════════════════════════════════════════════════╣`);

    console.log(`║ Name:  ${fullName.padEnd(52).substring(0, 52)} ║`);

    console.log(`║ Email: ${email.padEnd(52).substring(0, 52)} ║`);

    console.log(`║ Link:  ${resetLink.padEnd(52).substring(0, 52)} ║`);

    console.log(`║ Token: ${resetToken.padEnd(52).substring(0, 52)} ║`);

    console.log(`║ Expires in: 1 hour                                   ║`);

    console.log(`╚════════════════════════════════════════════════════════╝\n`);

    return false;

  }

};



/**

 * Send first password set email (for new staff after OTP login)

 * @param {string} email - Recipient email

 * @param {string} fullName - User's full name

 */

const sendFirstPasswordSetEmail = async (email, fullName) => {

  try {

    if (!canSendEmail()) {

      console.log(`\n╔════════════════════════════════════════════════════════╗`);

      console.log(`║    ✅ PASSWORD SET CONFIRMATION (DEV MODE)            ║`);

      console.log(`╠════════════════════════════════════════════════════════╣`);

      console.log(`║ Name:  ${fullName.padEnd(52).substring(0, 52)} ║`);

      console.log(`║ Email: ${email.padEnd(52).substring(0, 52)} ║`);

      console.log(`║ Status: Password successfully set                    ║`);

      console.log(`╚════════════════════════════════════════════════════════╝\n`);

      return true;

    }



    const mailOptions = {

      from: getSenderEmail(),

      to: email,

      subject: 'Smart Disaster Relief System - Set Your Password',

      html: `

        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">

          <div style="background-color: #1f2937; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center;">

            <h1 style="margin: 0; font-size: 24px;">Smart Disaster Relief System</h1>

          </div>

          <div style="background-color: #f3f4f6; padding: 30px; border-radius: 0 0 5px 5px;">

            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">

              Hello <strong>${fullName}</strong>,

            </p>

            <p style="color: #374151; font-size: 14px; margin-bottom: 20px;">

              Welcome to the Smart Disaster Relief System! You have successfully logged in with your OTP.

            </p>

            <p style="color: #374151; font-size: 14px; margin-bottom: 20px;">

              To complete the setup, you are required to set a new password. You will be prompted to do this when you access the system.

            </p>

            <p style="color: #d97706; background-color: #fef3c7; padding: 15px; border-radius: 5px; font-size: 14px; margin: 20px 0;">

              <strong>⚠️ Security Note:</strong> For security reasons, this password should be unique and not shared with anyone. Make sure to remember it for future logins.

            </p>

            <p style="color: #6b7280; font-size: 12px; margin-bottom: 20px; line-height: 1.6;">

              If you have any questions or need assistance, please contact the system administrator.

            </p>

            <hr style="border: none; border-top: 1px solid #d1d5db; margin: 20px 0;">

            <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">

              Smart Disaster Relief System | Disaster Management

            </p>

          </div>

        </div>

      `

    };



    await transporter.sendMail(mailOptions);

    console.log(`✅ First password set email sent successfully to ${email}`);

    return true;

  } catch (error) {

    console.error('❌ Error sending first password set email:', error.message);

    console.log(`\n⚠️  Email failed, showing confirmation in console:`);

    console.log(`\n╔════════════════════════════════════════════════════════╗`);

    console.log(`║    ✅ PASSWORD SET CONFIRMATION (DEV MODE)            ║`);

    console.log(`╠════════════════════════════════════════════════════════╣`);

    console.log(`║ Name:  ${fullName.padEnd(52).substring(0, 52)} ║`);

    console.log(`║ Email: ${email.padEnd(52).substring(0, 52)} ║`);

    console.log(`║ Status: Password successfully set                    ║`);

    console.log(`╚════════════════════════════════════════════════════════╝\n`);

    return true; // Return true so API response succeeds

  }

};



/**

 * Send a simple SMTP verification email

 * @param {string} email - Recipient email

 * @param {string} label - Optional label for the message

 */

const sendTestEmail = async (email, label = 'SMTP Verification') => {

  try {

    if (!canSendEmail()) {

      console.log(`\n╔════════════════════════════════════════════════════════╗`);

      console.log(`║          TEST EMAIL (DEV MODE FALLBACK)              ║`);

      console.log(`╠════════════════════════════════════════════════════════╣`);

      console.log(`║ To:    ${email.padEnd(52).substring(0, 52)} ║`);

      console.log(`║ Label: ${label.padEnd(52).substring(0, 52)} ║`);

      console.log(`╚════════════════════════════════════════════════════════╝\n`);

      return false;

    }



    const mailOptions = {

      from: getSenderEmail(),

      to: email,

      subject: `Smart Disaster Relief System - ${label}`,

      text: `This is a test email from Smart Disaster Relief System. SMTP configuration is working. Label: ${label}`,

      html: `

        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">

          <h2 style="color:#1f2937;">Smart Disaster Relief System</h2>

          <p>This is a test email to verify SMTP delivery.</p>

          <p><strong>Status:</strong> SMTP configuration is working.</p>

          <p><strong>Label:</strong> ${label}</p>

        </div>

      `

    };



    await transporter.sendMail(mailOptions);

    console.log(`✅ Test email sent successfully to ${email}`);

    return true;

  } catch (error) {

    console.error('❌ Error sending test email:', error.message);

    return false;

  }

};



module.exports = {

  sendOTPEmail,

  sendStaffOnboardingEmail,

  sendTestEmail,

  sendPasswordResetEmail,

  sendFirstPasswordSetEmail

};