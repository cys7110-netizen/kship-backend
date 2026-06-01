// 韓集集運 — 驗證驗證碼 API（無狀態版本）
// 用 HMAC 簽章比對，不依賴記憶體儲存

import crypto from 'crypto';

function getSigningKey() {
  return process.env.VERIFY_SECRET || process.env.RESEND_API_KEY || 'kship-default-secret';
}

function signCode(email, code, expiresAt) {
  const payload = `${email.toLowerCase()}|${code}|${expiresAt}`;
  return crypto.createHmac('sha256', getSigningKey()).update(payload).digest('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, code, token, expiresAt } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({ error: '缺少 email 或驗證碼' });
    }
    if (!token || !expiresAt) {
      return res.status(400).json({ error: '請先發送驗證碼' });
    }

    if (Date.now() > Number(expiresAt)) {
      return res.status(400).json({ error: '驗證碼已過期，請重新發送' });
    }

    // 重新計算 HMAC，看是否相符
    const expected = signCode(email, code.toString().trim(), Number(expiresAt));

    // timing-safe 比對
    const a = Buffer.from(token, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(400).json({ error: '驗證碼錯誤' });
    }

    return res.status(200).json({ success: true, message: '驗證成功' });

  } catch (err) {
    console.error('Verify error:', err);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
}
  }
}
