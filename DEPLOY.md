# Vercel 部署方案

给朋友展示用的最简单部署：把本仓库部署到 Vercel，用 Supabase 做后端。

---

## 一、本地需要改什么？

**一般情况下不用改任何代码。**

只要保证：

1. **不要提交敏感文件**  
   已通过 `.gitignore` 忽略：
   - `.env`、`.env.local` 及所有 `*.local`  
   - 不要从 `.gitignore` 里移除这些，也不要强制 `git add` 它们。

2. **可选**：若你希望部署时上传的包更小，可以加 `.vercelignore`（见下一节）。

3. **构建命令**  
   Vercel 会默认用 `npm run build`（即 `next build`），无需改 `package.json`。

---

## 二、哪些内容需要被 ignore？

### 已在 `.gitignore` 中（不会进 Git，也不会进 Vercel）

| 路径/模式 | 说明 |
|-----------|------|
| `node_modules/` | 依赖，Vercel 会重新安装 |
| `.next/`、`out/`、`build/`、`dist/` | 构建产物，Vercel 会重新构建 |
| `_plans/` | 设计/原型文档，不参与部署 |
| `.env`、`.env.local`、`*.local` | 环境变量与密钥，**绝对不能提交** |
| `.vercel` | Vercel 本地配置，由 Vercel CLI 生成 |
| `.idea/`、`.vscode/`、`.DS_Store` 等 | 本地/IDE 文件 |

以上**不要从 `.gitignore` 里删掉**，尤其是 `.env*` 和 `*.local`。

### 可选：`.vercelignore`

如果仓库里有一些和构建无关的大文件夹（例如以后把设计稿、视频放进仓库），可以新建 `.vercelignore`，让 Vercel 上传时跳过它们，加快部署：

```
# 可选：减小上传体积（这些不会参与 build）
_plans/
*.md
!README.md
```

说明：`_plans/` 若已在 `.gitignore` 里，本来就不会进 Git，也就不会上传到 Vercel；只有当你把 `_plans/` 从 `.gitignore` 移出、又希望部署包更小时，才需要在 `.vercelignore` 里写 `_plans/`。

---

## 三、部署步骤（Vercel）

### 1. 准备 Supabase

- 在 [Supabase](https://supabase.com) 建好项目。
- 在 Dashboard → **Settings → API** 里拿到：
  - **Project URL** → 用作 `NEXT_PUBLIC_SUPABASE_URL`
  - **anon public** key → 用作 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 建表与 RLS：按项目里的 `_plans/BUILD_COMPLETE.md` 和 `supabase-sql/*.sql` 在 Supabase SQL Editor 中执行。

### 2. 把代码推到 Git

- 在 GitHub / GitLab / Bitbucket 建一个仓库。
- 本地执行（注意不要提交 `.env.local`）：

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <你的仓库地址>
git push -u origin main
```

### 3. 在 Vercel 创建项目

1. 打开 [Vercel](https://vercel.com)，用 GitHub/GitLab 登录。
2. **Add New** → **Project**，导入刚推送的仓库。
3. **Framework Preset** 选 **Next.js**，**Root Directory** 保持默认，**Build Command** 保持 `npm run build`（或 `next build`）。

### 4. 配置环境变量

在 Vercel 项目里进入 **Settings → Environment Variables**，添加：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 是 | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | 否 | 用于 waitlist 升级、发邮件等，不填则部分后台功能不可用 |
| `RESEND_API_KEY` | 否 | 发预约/候补邮件，不填则不发邮件 |
| `EMAIL_FROM` | 否 | 发件人邮箱（用 Resend 发信时填）；要向任意收件人发信，须先在 Resend **Domains** 验证你的发信域名，再填该域名下的地址（见 `docs/SUPABASE-RESEND-SMTP.md`） |
| `NEXT_PUBLIC_APP_NAME` | 否 | 应用名称，默认 "Sofa Salon" |
| `NEXT_PUBLIC_APP_TAGLINE` | 否 | 副标题，默认 "Your host's living room" |

至少填好两个必填项后保存。

### 5. 部署

- 点击 **Deploy**；或之后每次 `git push` 都会自动重新部署。
- 部署完成后会得到一个 `https://xxx.vercel.app` 的地址，把这个链接发给朋友即可访问。

---

## 四、部署后检查

- 打开生成的 Vercel 链接，能打开首页、Ticker、能看到「即将放映」等。
- 若已配置 Supabase 表与 RLS：登录、选座、Profile、Admin 等应能正常使用。
- 若出现「找不到表」或 RLS 报错，到 Supabase SQL Editor 按顺序执行 `supabase-sql/` 下对应 SQL。

---

## 五、小结

| 项目 | 说明 |
|------|------|
| 本地要改的文件 | 无（仅需不提交 `.env.local`） |
| 需要 ignore 的 | 已由 `.gitignore` 覆盖；可选加 `.vercelignore` 减体积 |
| 部署方式 | Vercel 连 Git 仓库，配置好环境变量后 Deploy |
| 给朋友看 | 发 Vercel 提供的域名即可 |
