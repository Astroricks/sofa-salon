-- One-time cleanup (run once): legacy attended=true → present (null).
-- After this, run 35-reservations-attended-check.sql to enforce null | false only.

UPDATE reservations
SET attended = NULL
WHERE attended IS TRUE;
