-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Renewals amounts were implicitly USD ($ prefix in the UI). Adds a
-- currency column so renewals can use the same PKR/USD/GBP options as
-- Payments/Finance elsewhere in the app.

alter table freelance_hq_renewals
  add column if not exists currency text not null default 'PKR';
