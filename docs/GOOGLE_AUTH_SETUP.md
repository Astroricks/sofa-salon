# Google 登录 / Google Auth 配置清单

本地能登录、上线后却跳到 localhost，多半是 **Supabase 里只允许了本地地址**。按下面逐项检查。

---

## 1. Supabase Dashboard（必做）

### 1.1 允许生产环境的回调地址

Supabase 只会把用户重定向到「已加入白名单」的地址；`redirectTo` 不在名单里时，会改跳到 **Site URL**（很多项目这里还是 localhost）。

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目
2. 左侧 **Authentication** → **URL Configuration**
3. 在 **Redirect URLs** 里确保有：
   - 本地：必须包含**你实际用的 origin 和端口**，例如 `http://localhost:3000/**`、`http://localhost:3001/**`（Next 若跑在 3001 就加 3001）。
   - 密码重置邮件里的 `redirectTo` 是本站 `/auth/callback?next=...`；若该 URL 不在白名单里，Supabase 会退回到 **Site URL**（你看到的 `redirect_to=http://localhost:3001/` 就是这样），邮件链接里的 `code` 会出现在首页而不是 `/auth/callback`，会话无法建立。请至少加一条：`http://localhost:3001/auth/callback**` 或用通配 **`http://localhost:3001/**`**。
   - 生产：`https://ziggygraph.vercel.app/**`（换成你的真实域名）
4. 点 **Save**

支持通配符：一条 `https://ziggygraph.vercel.app/**` 即可覆盖该域名下所有路径（如 `/auth/callback?next=/profile`）。

**密码重置链接**：设计上只能**成功点一次**；再次点击会报 `otp_expired` / invalid link，这是预期（一次性 token）。项目中间件会把误落在首页的 `/?code=...` 转发到 `/auth/callback` 并进入设置新密码页；仍应在 Supabase 里把 **`/auth/callback`** 配进 Redirect URLs，避免依赖该兜底。

### 1.2 Site URL（建议改）

- **Site URL** 是「没指定 redirectTo 时的默认跳转」以及邮件里的链接等。
- 若你主要用生产环境，可改成：`https://ziggygraph.vercel.app`
- 若本地和线上都要用，保留 `http://localhost:3000` 也可以，但 **Redirect URLs 里一定要有生产地址**（上面那步）。

### 1.3 Google 提供商

- **Authentication** → **Providers** → **Google** 已启用
- **Client ID** / **Client Secret** 已填（来自 Google Cloud Console）
- Google Cloud Console 里「已授权的重定向 URI」包含：
  - `https://<你的 Supabase 项目 ref>.supabase.co/auth/v1/callback`
  - 不要填成你自己站点的 `/auth/callback`，OAuth 是先回 Supabase，再由 Supabase 重定向到你站。

---

## 2. 本仓库代码（当前逻辑）

- **登录页**（`LoginForm.tsx`）：点「使用 Google 登录」时，用 **当前页面的 origin** 拼出  
  `redirectTo = origin + '/auth/callback?next=...'`  
  所以在生产站点的页面上点，会传 `https://ziggygraph.vercel.app/auth/callback?next=...`，逻辑没问题。
- **回调页**（`auth/callback/route.ts`）：用 `x-forwarded-host` / `NEXT_PUBLIC_APP_URL` / `request.url` 算出要跳转的 origin，避免在 Vercel 上拿到 localhost。

只要 **Supabase Redirect URLs 里有生产域名**，就不会再被拉到 localhost。

---

## 3. 可选：Vercel 环境变量

若部署环境没有正确带 `x-forwarded-host`，可在 Vercel 里设：

- **Key**: `NEXT_PUBLIC_APP_URL`  
- **Value**: `https://ziggygraph.vercel.app`（不要末尾 `/`）

这样回调里会用这个作为 origin，不受代理影响。

---

## 4. 快速自检

| 检查项 | 位置 | 建议 |
|--------|------|------|
| 生产域名在白名单里 | Supabase → Auth → URL Configuration → Redirect URLs | 加 `https://你的域名/**` |
| Site URL | 同上 | 生产用可改为生产域名 |
| Google Client ID/Secret | Supabase → Auth → Providers → Google | 已填且与 Google Console 一致 |
| Google 重定向 URI | Google Cloud Console → 凭据 → OAuth 2.0 → 重定向 URI | 只填 Supabase 的 `.../auth/v1/callback` |

改完 Supabase 的 **Redirect URLs** 后无需改代码，重新部署一次再试一次 Google 登录即可。
