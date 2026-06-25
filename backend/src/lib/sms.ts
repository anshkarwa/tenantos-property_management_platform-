/**
 * Fast2SMS OTP helper — uses the Quick (q) route, no DLT approval needed
 * Docs: https://docs.fast2sms.com
 */

export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY;

  // Strip +91 prefix — Fast2SMS wants 10-digit numbers
  const number = phone.replace(/^\+91/, '');

  if (!apiKey || apiKey === 'your-fast2sms-key') {
    console.log(`\n📱 [DEV] OTP for ${phone}: ${otp}  (Fast2SMS not configured)\n`);
    return;
  }

  const message = `Your TenantOS OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`;

  const params = new URLSearchParams({
    authorization: apiKey,
    message,
    language: 'english',
    route: 'q',
    numbers: number,
  });

  try {
    const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`, {
      method: 'GET',
    });

    const json = (await res.json()) as any;
    console.log('[Fast2SMS] Response:', JSON.stringify(json));

    if (json.return !== true) {
      throw new Error(Array.isArray(json?.message) ? json.message[0] : (json?.message || 'Fast2SMS returned failure'));
    }

    console.log(`[Fast2SMS] OTP sent to ${phone}`);
  } catch (err: any) {
    console.error('[Fast2SMS] Error:', err.message);
    throw err;
  }
}
