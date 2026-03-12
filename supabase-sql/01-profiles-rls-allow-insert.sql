-- 修复："new row violates row-level security policy for table profiles"
-- 用途：允许已登录用户插入自己的 profile 行（前端 upsert 用）
-- 在 Supabase SQL Editor 里执行一次即可。

DROP POLICY IF EXISTS "Own insert" ON profiles;
CREATE POLICY "Own insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
