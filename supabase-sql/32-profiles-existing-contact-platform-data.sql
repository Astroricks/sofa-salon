-- Data fix after 31-profiles-contact-platform.sql:
-- All existing guests used the legacy field as WeChat ID, except:
--   charles.j.lovering, Sister TangYi (WhatsApp).
-- Safe to re-run.

-- Everyone else: WeChat platform; keep id in contact_id and wechat_id.
UPDATE profiles
SET
  contact_platform = 'wechat',
  contact_id = COALESCE(NULLIF(btrim(contact_id), ''), btrim(wechat_id)),
  wechat_id = COALESCE(NULLIF(btrim(contact_id), ''), btrim(wechat_id))
WHERE lower(btrim(display_name)) NOT IN (
    lower('charles.j.lovering'),
    lower('Sister TangYi')
  )
  AND (
    btrim(COALESCE(contact_id, '')) <> ''
    OR btrim(COALESCE(wechat_id, '')) <> ''
  );

-- WhatsApp guests (value was stored in wechat_id before multi-platform UI).
UPDATE profiles
SET
  contact_platform = 'whatsapp',
  contact_id = COALESCE(NULLIF(btrim(contact_id), ''), btrim(wechat_id)),
  wechat_id = ''
WHERE lower(btrim(display_name)) IN (
    lower('charles.j.lovering'),
    lower('Sister TangYi')
  )
  AND (
    btrim(COALESCE(contact_id, '')) <> ''
    OR btrim(COALESCE(wechat_id, '')) <> ''
  );
