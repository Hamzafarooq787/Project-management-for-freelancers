-- Incremental migration. Safe to run once in the SQL Editor.
--
-- Lets a project be permanently deleted (not just archived) with a choice of
-- whether to keep its payment history. Pricing plans (payment_plans) are
-- always removed with the project — a recurring-fee config only makes sense
-- attached to a live project. The payment ledger (payments) is different:
-- it's money you've already been paid, so project_id is now nullable, and
-- deleting a project can optionally detach (rather than delete) its payments
-- so historical totals on the Finance page keep counting them.

alter table payments alter column project_id drop not null;
