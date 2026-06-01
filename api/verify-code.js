// 韓集集運 — 驗證驗證碼 API
// 接收 email + code，比對是否正確

globalThis._verifyCodes = globalThis._verifyCodes || new Map();
const codes = globalThis._verifyCodes;

export default async function handler(req, res) {
  // CORS
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
    const { email, code } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({ error: '缺少 email 或驗證碼' });
    }

    const entry = codes.get(email);
    
    if (!entry) {
      return res.status(400).json({ error: '請先發送驗證碼' });
    }

    if (Date.now() > entry.expiresAt) {
      codes.delete(email);
      return res.status(400).json({ error: '驗證碼已過期，請重新發送' });
    }

    if (entry.code !== code.toString().trim()) {
      return res.status(400).json({ error: '驗證碼錯誤' });
    }

    // 驗證成功，刪除記錄
    codes.delete(email);

    return res.status(200).json({ success: true, message: '驗證成功' });

  } catch (err) {
    console.error('Verify error:', err);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
}
