
// 韓集集運 — 發送驗證碼 API（無狀態版本）
// 使用 HMAC 簽章驗證，不依賴記憶體儲存（適合 Serverless）

import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

function getSigningKey() {
  return process.env.VERIFY_SECRET || process.env.RESEND_API_KEY || 'kship-default-secret';
}

function signCode(email, code, expiresAt) {
  const payload = `${email.toLowerCase()}|${code}|${expiresAt}`;
  return crypto.createHmac('sha256', getSigningKey()).update(payload).digest('hex');
}

globalThis._rateLimitMap = globalThis._rateLimitMap || new Map();
const rateLimit = globalThis._rateLimitMap;

function isRateLimited(email) {
  const lastSent = rateLimit.get(email);
  if (!lastSent) return false;
  return (Date.now() - lastSent) < 60 * 1000;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body || {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: '電子郵件格式錯誤' });
    }

    if (isRateLimited(email)) {
      return res.status(429).json({ error: '請稍候 60 秒後再重新發送' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const token = signCode(email, code, expiresAt);

    rateLimit.set(email, Date.now());

    const { data, error } = await resend.emails.send({
      from: '韓集集運 <noreply@hanji2020.com>',
      to: email,
      subject: '【韓集集運】您的註冊驗證碼',
      html: `
        <div style="font-family: 'Noto Sans TC', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #1B4F8A; font-size: 24px; margin: 0;">韓集<span style="color: #1B4F8A;">集</span>運</h1>
            <p style="color: #666; font-size: 13px; margin-top: 4px;">HanJi Logistics</p>
          </div>
          <h2 style="color: #1B4F8A; font-size: 18px; margin-bottom: 16px;">您的註冊驗證碼</h2>
          <p style="color: #444; font-size: 14px; line-height: 1.8;">
            您好，感謝您註冊韓集集運會員！<br>
            請於 <strong>10 分鐘內</strong> 在註冊頁面輸入下方驗證碼，完成電子郵件驗證：
          </p>
          <div style="background: rgba(27,79,138,0.05); border: 2px solid rgba(27,79,138,0.2); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <div style="font-size: 36px; font-weight: 700; color: #1B4F8A; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</div>
          </div>
          <p style="color: #888; font-size: 12px; line-height: 1.7;">
            ⚠️ 此驗證碼僅供本次註冊使用，請勿轉發給他人。<br>
            若您未進行註冊操作，請忽略此封信件。
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <div style="color: #999; font-size: 11px; text-align: center; line-height: 1.7;">
            此信件由系統自動發送，請勿直接回覆。<br>
            如有任何疑問，請聯繫 LINE 客服 <strong>@HANJI2020</strong><br>
            <br>
            © 2026 韓集國際物流 HanJi Logistics
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: '寄信失敗，請稍後再試' });
    }

    return res.status(200).json({
      success: true,
      message: '驗證碼已發送',
      token: token,
      expiresAt: expiresAt
    });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
}
