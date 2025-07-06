
'use server';

import { sendEmail } from '@/lib/emailService';
import {
  getRateLimitConfig,
  getNotificationSettings,
  getGeneralSettings,
  getUsers,
  saveUsers,
} from './data-management-actions';
import type { RateLimitConfig, User, UserRole, AccountStatus } from '@/lib/types';
import CryptoJS from 'crypto-js';
import { connectToDatabase } from '@/lib/mongodb';

// In-memory store for OTP request counts and timestamps (CONCEPTUAL for dev, not production-ready)
interface RateLimitCounter {
  count: number;
  timestamp: number; // Timestamp of the start of the current window
}
const otpRequestTrackers: Record<string, { hourly: RateLimitCounter; daily: RateLimitCounter }> = {};
// In-memory store for signup OTPs (CONCEPTUAL for dev, not production-ready) - USED AS FALLBACK for CSV
const signupOtps: Record<string, { otp: string, timestamp: number }> = {};


async function checkAndIncrementOtpLimit(email: string): Promise<{ allowed: boolean; message: string }> {
  const config = await getRateLimitConfig();
  const now = Date.now();
  if (!otpRequestTrackers[email]) {
    otpRequestTrackers[email] = { hourly: { count: 0, timestamp: now }, daily: { count: 0, timestamp: now }};
  }
  const tracker = otpRequestTrackers[email];
  const oneHour = 60 * 60 * 1000;
  if (now - tracker.hourly.timestamp > oneHour) tracker.hourly = { count: 0, timestamp: now };
  if (tracker.hourly.count >= config.otpRequestsPerHour) {
    console.warn(`[Rate Limit] OTP hourly limit reached for ${email}. Limit: ${config.otpRequestsPerHour}`);
    return { allowed: false, message: `Too many OTP requests. Please try again in an hour. Max ${config.otpRequestsPerHour} requests/hr.` };
  }
  const oneDay = 24 * 60 * 60 * 1000;
  if (now - tracker.daily.timestamp > oneDay) tracker.daily = { count: 0, timestamp: now };
  if (tracker.daily.count >= config.otpRequestsPerDay) {
    console.warn(`[Rate Limit] OTP daily limit reached for ${email}. Limit: ${config.otpRequestsPerDay}`);
    return { allowed: false, message: `Daily OTP request limit reached. Please try again tomorrow. Max ${config.otpRequestsPerDay} requests/day.` };
  }
  tracker.hourly.count++;
  tracker.daily.count++;
  console.log(`[Rate Limit] OTP request for ${email}: Hourly count ${tracker.hourly.count}/${config.otpRequestsPerHour}, Daily count ${tracker.daily.count}/${config.otpRequestsPerDay}`);
  return { allowed: true, message: "OTP request allowed." };
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const DEV_OTP = "123456"; // For testing when SMTP is not configured
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function isSmtpConfigured(): boolean {
  return !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS && !!process.env.EMAIL_FROM;
}


// --- Conceptual Encryption/Decryption Guidance (NOT FOR PRODUCTION PASSWORDS) ---
// This section demonstrates how AES encryption COULD be used with crypto-js.
// IT IS CRITICAL TO UNDERSTAND THAT AES ENCRYPTION IS NOT THE CORRECT WAY TO STORE PASSWORDS.
// PASSWORDS SHOULD BE HASHED USING A STRONG ONE-WAY ALGORITHM LIKE bcrypt or Argon2.
//
// `const AES_ENCRYPTION_KEY = process.env.AES_ENCRYPTION_KEY; // MUST be strong (e.g., 256-bit) and kept highly secret, ideally from a secure key management system.`
//
// To Encrypt (e.g., before saving some data, NOT a password):
// `if (AES_ENCRYPTION_KEY && plaintextData) {`
// `  const ciphertext = CryptoJS.AES.encrypt(plaintextData, AES_ENCRYPTION_KEY).toString();`
// `  // Store this ciphertext in your CSV or database`
// `} else { console.error("AES Encryption Key is missing or data is empty!"); }`
//
// To Decrypt (e.g., when retrieving and needing to use the data, NOT for password comparison):
// `if (AES_ENCRYPTION_KEY && ciphertextFromStorage) {`
// `  try {`
// `    const bytes = CryptoJS.AES.decrypt(ciphertextFromStorage, AES_ENCRYPTION_KEY);`
// `    const originalData = bytes.toString(CryptoJS.enc.Utf8);`
// `    if (originalData) { /* Use originalData */ } else { /* Decryption failed or resulted in empty text (wrong key or corrupted data?) */ }`
// `  } catch (e) { /* Handle decryption error, e.g., Malformed UTF-8 data */ }`
// `} else { console.error("AES Decryption Key is missing or ciphertext is empty!"); }`
//
// **AGAIN: DO NOT USE THIS APPROACH FOR PASSWORDS. USE BCRYPT OR ARGON2 FOR PASSWORD HASHING.**
// The following code uses PLAINTEXT passwords for CSV storage as per explicit request for this prototype.
// --- End Conceptual Encryption Guidance ---

export async function signupUser(name: string, email: string, plainPasswordProvided: string): Promise<{ success: boolean; message: string; user?: Pick<User, 'id' | 'email' | 'name' | 'role' | 'phone' | 'accountStatus'>, otpSent?: boolean }> {
  console.warn(
    `[CRITICAL_SECURITY_WARNING] signupUser Action (Server-Side):\n` +
    `  Attempting to sign up user: ${email}\n` +
    `  Password will be stored in PLAINTEXT in users.csv: ${plainPasswordProvided ? plainPasswordProvided.substring(0,1) + '*****' : 'N/A'}\n` +
    `  --- THIS IS EXTREMELY INSECURE AND MUST NEVER BE USED IN A PRODUCTION ENVIRONMENT. ---`
  );

  // Rate limit check for OTP applies to signup initiation as well
  const rateLimitCheck = await checkAndIncrementOtpLimit(email);
  if (!rateLimitCheck.allowed) {
    return { success: false, message: rateLimitCheck.message };
  }

  try {
    const users = await getUsers();
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return { success: false, message: "An account with this email already exists." };
    }

    const newUser: User = {
      id: `user-${crypto.randomUUID().substring(0, 8)}`,
      email: email,
      password: plainPasswordProvided, // Storing plaintext password
      name: name,
      role: 'user', // Default role for new signups
      accountStatus: 'pending_verification',
    };

    const saveResult = await saveUsers([...users, newUser]);
    if (!saveResult.success) {
      return { success: false, message: `Failed to save new user: ${saveResult.message}` };
    }
    
    const { password, ...userToReturnForEmail } = newUser;

    const otpResult = await sendSignupOtp(email, name);
    if (!otpResult.success) {
      console.error(`[Auth Action] User ${email} created, but OTP sending failed: ${otpResult.message}`);
      return { success: true, message: `Account created. ${otpResult.message}`, user: userToReturnForEmail, otpSent: false };
    }
    
    const notificationSettings = await getNotificationSettings();
    const generalSettings = await getGeneralSettings();
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL_NOTIFICATIONS || generalSettings.footerContactEmail || process.env.EMAIL_FROM;
    if (notificationSettings.admin.notifyOnNewUserSignup && adminEmail) {
        const adminHtmlContent = `<h2>New User Signup (Pending Verification): ${name}</h2><p>Email: ${email}</p><p>Role: user</p>`;
        await sendEmail({ to: adminEmail, subject: `New User Signup (Pending Verification): ${name}`, html: adminHtmlContent });
    }

    return { 
        success: true, 
        message: `Account created. ${otpResult.message}`,
        user: userToReturnForEmail,
        otpSent: true 
    };

  } catch (error) {
    console.error("[Auth Action] Error during signupUser:", error);
    return { success: false, message: "An unexpected error occurred during signup." };
  }
}

export async function loginUser(email: string, plainPasswordProvided: string): Promise<{ success: boolean; message: string; user?: Pick<User, 'id' | 'email' | 'name' | 'role' | 'phone' | 'accountStatus'> }> {
  console.warn(
    `[CRITICAL_SECURITY_WARNING] loginUser Action (Server-Side):\n` +
    `  Attempting login for: ${email}\n` +
    `  Password provided (PLAINTEXT for comparison): ${plainPasswordProvided ? plainPasswordProvided.substring(0,1) + '*****' : 'N/A'}\n` +
    `  --- THIS IS A PROTOTYPE FLOW COMPARING PLAINTEXT PASSWORDS FROM users.csv. ---` +
    `  --- THIS IS EXTREMELY INSECURE AND MUST NEVER BE USED IN A PRODUCTION ENVIRONMENT. ---`
  );

  try {
    const users = await getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return { success: false, message: "User not found." };
    }

    if (user.accountStatus === 'pending_verification') {
        return { success: false, message: "Your account is pending email verification. Please check your email for an OTP or request a new one if needed." };
    }
    if (user.accountStatus !== 'active') {
        return { success: false, message: `Your account is currently ${user.accountStatus}. Please contact support.` };
    }

    if (user.password !== plainPasswordProvided) {
      console.warn(`[Auth Action] Login failed for ${email}: Incorrect password provided.`);
      return { success: false, message: "Invalid password." };
    }
    
    const { password, ...userToReturn } = user;
    console.log(`[Auth Action] Login successful for ${email}. User data (excluding password) being returned.`);
    return { success: true, message: "Login successful. Password matched PLAINTEXT stored value (INSECURE).", user: userToReturn };

  } catch (error) {
    console.error("[Auth Action] Error during loginUser:", error);
    return { success: false, message: "An unexpected error occurred during login." };
  }
}

export async function sendPasswordResetOtp(email: string): Promise<{ success: boolean; message: string; messageId?: string }> {
  const rateLimitCheck = await checkAndIncrementOtpLimit(email);
  if (!rateLimitCheck.allowed) {
    return { success: false, message: rateLimitCheck.message };
  }

  const users = await getUsers();
  const userExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
  if (!userExists) {
    console.warn(`[Auth Action] Password reset OTP requested for non-existent email: ${email}. Sending generic success to client.`);
    return { success: true, message: "If an account with this email exists, an OTP has been sent." };
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  
  if (process.env.DATA_SOURCE === 'mongodb') {
    try {
      const { db } = await connectToDatabase();
      await db.collection('otps').updateOne(
        { email },
        { $set: { email, otp, expiresAt } },
        { upsert: true }
      );
      console.log(`[Auth Action] Stored Password Reset OTP in MongoDB for ${email}. Expires at ${expiresAt.toISOString()}`);
    } catch (dbError) {
      console.error('[Auth Action] Failed to store OTP in MongoDB:', dbError);
      return { success: false, message: "Failed to store OTP. Please try again." };
    }
  } else {
    signupOtps[email] = { otp, timestamp: Date.now() }; 
    console.log(`[Auth Action] Generated Password Reset OTP for ${email}: ${otp}. Stored in-memory for conceptual verification.`);
  }

  const subject = 'Your TableMaster Password Reset OTP';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Password Reset Request</h2>
      <p>Your One-Time Password (OTP) for resetting your TableMaster password is:</p>
      <p style="font-size: 24px; font-weight: bold; color: #A93226;">${otp}</p>
      <p>This OTP is valid for 10 minutes. Please do not share it with anyone.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
      <br/><p>Thanks,</p><p>The TableMaster Team</p>
    </div>
  `;
  
  if (!isSmtpConfigured()) {
    const message = `Email server (SMTP) is not configured. Password Reset OTP for ${email} is ${otp} (logged for dev).`;
    console.warn(message);
    return { success: true, message: `Password Reset OTP generated (dev only, logged to console as SMTP is not configured). OTP: ${otp}`, messageId: "mock_otp_console_log" };
  }

  const emailResult = await sendEmail({ to: email, subject, html: htmlContent });
  if (!emailResult.success) return { success: false, message: emailResult.message };
  return { success: true, message: "Password reset OTP sent successfully.", messageId: emailResult.messageId };
}

// Generic OTP sending function
export async function sendSignupOtp(email: string, name: string): Promise<{ success: boolean; message: string; messageId?: string }> {
  // This function is called by signupUser, which already performs rate limiting.
  // If called directly in the future for resend, it would need its own rate limit check.
  
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  
  if (process.env.DATA_SOURCE === 'mongodb') {
     try {
      const { db } = await connectToDatabase();
      await db.collection('otps').updateOne(
        { email },
        { $set: { email, otp, expiresAt } },
        { upsert: true }
      );
      console.log(`[Auth Action] Stored SIGNUP OTP in MongoDB for ${email}. Expires at ${expiresAt.toISOString()}`);
    } catch (dbError) {
      console.error('[Auth Action] Failed to store OTP in MongoDB:', dbError);
      return { success: false, message: "Failed to store OTP. Please try again." };
    }
  } else {
    signupOtps[email] = { otp, timestamp: Date.now() }; 
    console.log(`[Auth Action] Generated SIGNUP OTP for ${email}: ${otp}. Stored in-memory for conceptual verification.`);
  }

  const subject = 'Verify Your TableMaster Account';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Welcome to TableMaster, ${name}!</h2>
      <p>Please use the following One-Time Password (OTP) to verify your email address:</p>
      <p style="font-size: 24px; font-weight: bold; color: #A93226;">${otp}</p>
      <p>This OTP is valid for 10 minutes. Please do not share it with anyone.</p>
      <p>If you did not request this, please ignore this email.</p>
      <br/><p>Thanks,</p><p>The TableMaster Team</p>
    </div>
  `;

  if (!isSmtpConfigured()) {
    const message = `Email server (SMTP) is not configured. Signup OTP for ${email} is ${otp} (logged for dev).`;
    console.warn(message);
    return { success: true, message: `Signup OTP generated (dev only, logged to console as SMTP is not configured). OTP: ${otp}`, messageId: "mock_otp_console_log" };
  }
  
  const emailResult = await sendEmail({ to: email, subject, html: htmlContent });
  if (!emailResult.success) return { success: false, message: emailResult.message };
  return { success: true, message: "Signup verification OTP sent successfully.", messageId: emailResult.messageId };
}


export async function resendSignupOtp(email: string): Promise<{ success: boolean; message: string; messageId?: string }> {
  console.log(`[Auth Action] Resend SIGNUP OTP requested for ${email}.`);
  const rateLimitCheck = await checkAndIncrementOtpLimit(email);
  if (!rateLimitCheck.allowed) {
    return { success: false, message: rateLimitCheck.message };
  }

  const users = await getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.warn(`[Auth Action] Resend OTP requested for non-existent email during signup flow: ${email}.`);
    return { success: false, message: "User not found. Please try signing up again." };
  }
  if (user.accountStatus === 'active') {
    return { success: false, message: "This account is already active. You can log in."};
  }
  if (user.accountStatus !== 'pending_verification') {
    return { success: false, message: `Cannot resend OTP for account with status: ${user.accountStatus}.`};
  }

  // Proceed to send a new OTP using the sendSignupOtp logic
  return sendSignupOtp(email, user.name || "User");
}


export async function verifySignupOtpAndActivateUser(email: string, otp: string): Promise<{ success: boolean; message: string }> {
  console.log(`[Auth Action] Verifying SIGNUP OTP for ${email}, entered OTP ${otp}.`);
  
  let isValidOtp = false;

  if (process.env.DATA_SOURCE === 'mongodb') {
    const { db } = await connectToDatabase();
    const storedOtpData = await db.collection<{email: string; otp: string; expiresAt: Date}>('otps').findOne({ email });

    if (storedOtpData && storedOtpData.otp === otp && storedOtpData.expiresAt >= new Date()) {
      isValidOtp = true;
      await db.collection('otps').deleteOne({ email }); // Delete on success
    } else if (storedOtpData && storedOtpData.expiresAt < new Date()) {
      await db.collection('otps').deleteOne({ email }); // Delete expired
      return { success: false, message: "OTP has expired. Please request a new one." };
    }
  } else {
    // CSV / In-memory fallback
    const storedOtpData = signupOtps[email];
    if (storedOtpData && storedOtpData.otp === otp && (Date.now() - storedOtpData.timestamp <= OTP_EXPIRY_MS)) {
      isValidOtp = true;
      delete signupOtps[email];
    } else if (storedOtpData && (Date.now() - storedOtpData.timestamp > OTP_EXPIRY_MS)) {
      delete signupOtps[email];
      return { success: false, message: "OTP has expired. Please request a new one." };
    }
  }
  
  // Allow Dev OTP if not valid and SMTP is not configured
  if (!isValidOtp) {
    if (isSmtpConfigured() || otp !== DEV_OTP) {
        console.warn(`[Auth Action] Invalid OTP for ${email}.`);
        return { success: false, message: "Invalid OTP." };
    }
    console.log(`[Auth Action] DEV MODE: Signup OTP ${otp} matched developer OTP for ${email}.`);
    isValidOtp = true; // Mark as valid for dev purposes
  }
  
  // If we reach here, OTP was valid (either from store or dev fallback)
  try {
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (userIndex === -1) {
      console.error(`[Auth Action] User ${email} not found during OTP verification, though they should exist.`);
      return { success: false, message: "User not found. Please try signing up again." };
    }
    if (users[userIndex].accountStatus === 'active') {
      console.log(`[Auth Action] Account for ${email} is already active.`);
      return { success: true, message: "Account already active. You can now log in." };
    }
    
    users[userIndex].accountStatus = 'active';
    const saveResult = await saveUsers(users);

    if (!saveResult.success) {
      console.error(`[Auth Action] Failed to update user status to active for ${email}: ${saveResult.message}`);
      return { success: false, message: `OTP verified, but failed to activate account: ${saveResult.message}` };
    }
    
    console.log(`[Auth Action] Account for ${email} activated successfully after OTP verification.`);
    return { success: true, message: "Email verified successfully! Your account is now active. Please log in." };

  } catch (error) {
    console.error("[Auth Action] Error during verifySignupOtpAndActivateUser:", error);
    return { success: false, message: "An unexpected error occurred during account activation." };
  }
}


export async function resetPasswordWithOtp(email: string, otp: string, newPassword_plaintext: string): Promise<{ success: boolean, message: string }> {
  console.warn(
    `[CRITICAL_SECURITY_WARNING] resetPasswordWithOtp Action (Server-Side):\n`+
    `  Attempting to reset password for: ${email}\n` +
    `  New Password (PLAINTEXT): ${newPassword_plaintext ? newPassword_plaintext.substring(0,1) + '*****' : 'N/A'}\n` +
    `  --- THIS WILL UPDATE A PLAINTEXT PASSWORD IN users.csv. ---`+
    `  --- THIS IS EXTREMELY INSECURE AND MUST NEVER BE USED IN A PRODUCTION ENVIRONMENT. ---`
  );
  console.log(`[Auth Action] Attempting Password Reset with OTP for ${email}.`);
  
  let isValidOtp = false;
  
  if (process.env.DATA_SOURCE === 'mongodb') {
    const { db } = await connectToDatabase();
    const storedOtpData = await db.collection<{email: string; otp: string; expiresAt: Date}>('otps').findOne({ email });

    if (storedOtpData && storedOtpData.otp === otp && storedOtpData.expiresAt >= new Date()) {
      isValidOtp = true;
      await db.collection('otps').deleteOne({ email });
    } else if (storedOtpData && storedOtpData.expiresAt < new Date()) {
      await db.collection('otps').deleteOne({ email });
      return { success: false, message: "OTP has expired. Please request a new one." };
    }
  } else {
    // CSV / In-memory fallback
    const storedOtpData = signupOtps[email];
    if (storedOtpData && storedOtpData.otp === otp && (Date.now() - storedOtpData.timestamp <= OTP_EXPIRY_MS)) {
      isValidOtp = true;
      delete signupOtps[email];
    } else if (storedOtpData && (Date.now() - storedOtpData.timestamp > OTP_EXPIRY_MS)) {
      delete signupOtps[email];
      return { success: false, message: "OTP has expired. Please request a new one." };
    }
  }

  // Allow Dev OTP if not valid and SMTP is not configured
  if (!isValidOtp) {
    if (isSmtpConfigured() || otp !== DEV_OTP) {
        console.warn(`[Auth Action] Invalid OTP for password reset for ${email}.`);
        return { success: false, message: "Invalid OTP." };
    }
    console.log(`[Auth Action] DEV MODE: Password reset OTP ${otp} matched developer OTP for ${email}.`);
    isValidOtp = true;
  }
  
  // If we reach here, OTP was valid
  try {
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (userIndex === -1) {
      return { success: false, message: "User not found." };
    }
    users[userIndex].password = newPassword_plaintext; 
    users[userIndex].accountStatus = 'active'; // Ensure account is active after password reset
    const saveResult = await saveUsers(users);
    if (!saveResult.success) {
      return { success: false, message: `Failed to save new password: ${saveResult.message}` };
    }
    console.log(`[Auth Action] Password for ${email} reset and stored as PLAINTEXT in users.csv. Account set to active.`);
    return { success: true, message: "Password reset successfully. New password stored in PLAINTEXT (INSECURE)." };
  } catch (error) {
    console.error("[Auth Action] Error during resetPasswordWithOtp:", error);
    return { success: false, message: "An unexpected error occurred during password reset." };
  }
}
    
