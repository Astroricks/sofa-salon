# 用 Resend 发 Supabase 验证邮件（绕过默认限制）

Supabase 自带的发信有严格限制（例如每小时仅数封），验证邮件经常发不出去。可以改为使用 **Resend 的 SMTP**，让 Supabase 的**所有 Auth 邮件**（验证、重置密码等）都通过 Resend 发送，不再占用 Supabase 配额。

## 步骤

1. **Resend 准备**
   - 在 [Resend](https://resend.com) 注册并**验证发信域名**（Domains）。
   - 在 [API Keys](https://resend.com/api-keys) 创建一个 API Key（SMTP 用同一个 Key）。

2. **Supabase 里配置自定义 SMTP**
   - 打开 Supabase Dashboard → 你的项目 → **Authentication** → **SMTP Settings**（或 **Email Templates** 附近的 SMTP 配置）。
   - 启用自定义 SMTP，并填写：
     - **Sender email**：你在 Resend 验证过的邮箱（如 `noreply@yourdomain.com`）。
     - **Sender name**：发件人名称（如你的应用名）。
     - **Host**: `smtp.resend.com`
     - **Port**: `465`
     - **Username**: `resend`
     - **Password**: 你的 **Resend API Key**（与代码里 `RESEND_API_KEY` 可相同）。
   - 保存。

3. **结果**
   - 之后 Supabase 发出的**验证邮件、密码重置等**都会走 Resend，不再受 Supabase 默认限制。
   - 发信量按 Resend 套餐计费；免费额度通常足够中小规模使用。

4. **Redirect URLs（密码重置）**  
   `resetPasswordForEmail` 使用 `redirectTo = <你的站点>/auth/callback?next=/auth/update-password`。必须在 **Redirect URLs** 中允许该 origin（本地含端口，如 `http://localhost:3001/**`）。若未允许，Supabase 会把用户退回到 **Site URL**（常见为 `http://localhost:3001/`），链接变成带上 `?code=` 的首页，无法换票；修复白名单后重新申请重置邮件即可。

## 参考

- [Resend: Send emails using Supabase with SMTP](https://resend.com/docs/send-with-supabase-smtp)
- [Supabase: Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
