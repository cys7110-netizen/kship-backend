# 韓集集運 後端 API

提供 Email 驗證碼寄送與驗證功能，使用 Resend 寄信服務。

## API 端點

- `POST /api/send-code` — 寄送驗證碼到指定 email
  - body: `{ "email": "user@example.com" }`
- `POST /api/verify-code` — 驗證使用者輸入的驗證碼
  - body: `{ "email": "user@example.com", "code": "123456" }`

## 環境變數

需在 Vercel 設定：
- `RESEND_API_KEY` — Resend API Key (re_xxx...)

## 部署

部署到 Vercel：
1. Push 到 GitHub
2. 在 Vercel Import 此 Repository
3. 在 Environment Variables 加入 `RESEND_API_KEY`
4. Deploy

## 注意事項

- 驗證碼有效期 10 分鐘
- 同一 email 60 秒內只能寄一次（防濫用）
- 目前用記憶體儲存驗證碼，重啟後會清空（小流量可接受）
