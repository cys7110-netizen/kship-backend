// 韓集集運 — 發送驗證碼 API
// 接收 email，產生 6 位數驗證碼，存到記憶體，透過 Resend 寄信

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// 簡易記憶體儲存（重啟會清空，正式建議改 Redis 或資料庫）
// key: email, value: { code, expiresAt }
globalThis._verifyCodes = globalThis._verifyCodes || new Map();
const codes = globalThis._verifyCodes;

// 限速：同一 email 60 秒內只能寄一次
function isRateLimited(email) {
  const entry = codes.get(email);
  if (!entry) return false;
  const elapsed = Date.now() - (entry.sentAt || 0);
  return elapsed < 60 * 1000;
}

export default async function handler(req, res) {
  // CORS（允許跨網域呼叫，正式部署可限制特定網域）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body || {};

    // 驗證 email 格式
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: '電子郵件格式錯誤' });
    }

    // 限速檢查
    if (isRateLimited(email)) {
      return res.status(429).json({ error: '請稍候 60 秒後再重新發送' });
    }

    // 產生 6 位數驗證碼
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 分鐘有效

    // 儲存到記憶體
    codes.set(email, { code, expiresAt, sentAt: Date.now() });

    // 寄信
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

    return res.status(200).json({ success: true, message: '驗證碼已發送' });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
}
