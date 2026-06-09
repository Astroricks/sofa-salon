-- Data fix after 31-profiles-contact-platform.sql:
-- All existing guests used the legacy field as WeChat ID, except guests listed below (WhatsApp).
-- Edit YOUR_WHATSAPP_DISPLAY_NAME_* before running on your instance. Safe to re-run.
-- On a fresh install with no profiles, this updates zero rows.

-- Everyone else: WeChat platform; keep id in contact_id and wechat_id.
UPDATE profiles
SET
  contact_platform = 'wechat',
  contact_id = COALESCE(NULLIF(btrim(contact_id), ''), btrim(wechat_id)),
  wechat_id = COALESCE(NULLIF(btrim(contact_id), ''), btrim(wechat_id))
WHERE lower(btrim(display_name)) NOT IN (
    lower('YOUR_WHATSAPP_DISPLAY_NAME_1'),
    lower('YOUR_WHATSAPP_DISPLAY_NAME_2')
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
    lower('YOUR_WHATSAPP_DISPLAY_NAME_1'),
    lower('YOUR_WHATSAPP_DISPLAY_NAME_2')
  )
  AND (
    btrim(COALESCE(contact_id, '')) <> ''
    OR btrim(COALESCE(wechat_id, '')) <> ''
  );
