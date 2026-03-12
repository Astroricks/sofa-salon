# Supabase 额外 SQL（按需运行）

主建表与策略的完整 SQL 在 **`_plans/BUILD_COMPLETE.md`** 里，需要先跑那一整段。

本文件夹里是**之后新增的、单独要跑的内容**：每出现一个新需求或修复，就**新增一个文件**，不会改旧文件。  
这样你可以清楚知道：**这次只要新跑哪个文件**。

## 文件列表

| 文件 | 用途 | 何时跑 |
|------|------|--------|
| `01-profiles-rls-allow-insert.sql` | 允许用户插入自己的 profile 行（修复 “new row violates row-level security policy”） | 出现该 RLS 报错时跑一次 |
| `02-screenings-year-director-duration.sql` | screenings 表增加 year, director, duration_minutes（卡片显示 “1994 · Wong Kar-wai · 98 min”） | 需要卡片显示年份/导演/时长时跑一次 |
| `03-profiles-admin-read-wechat.sql` | 管理员可读所有 profiles 的 wechat_id（座位图点击观众详情） | 需要管理员查看观众微信号时跑一次 |
| `04-ratings-and-ticker.sql` | screening_ratings（用户对影片质量 1–5 星）、ticker_custom、ticker_config（跑马灯管理） | 需要观看历史评分与跑马灯管理时跑一次 |

在 Supabase 控制台 → **SQL Editor** 里打开对应文件，复制内容执行即可。
