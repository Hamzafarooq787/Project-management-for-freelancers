-- Replaces stages on existing web development projects with the current
-- default set (Create Pages, Services, Contact Details, Hosting Details).
-- Tasks assigned to a removed stage become unassigned ("No Stage") rather
-- than being deleted, since tasks.stage_id uses ON DELETE SET NULL — nothing
-- you've already logged is lost.
--
-- Safe to run more than once. Run in the Supabase SQL Editor.

-- 1. Remove any stage on a web_dev project that isn't one of the four
--    current defaults (drops the old Discovery / Design / Frontend /
--    Backend / Testing / Deployment / Client Review / Maintenance stages).
delete from stages
where project_id in (select id from projects where type = 'web_dev')
  and name not in ('Create Pages', 'Services', 'Contact Details', 'Hosting Details');

-- 2. Add whichever of the four default stages a web_dev project is missing
--    (covers projects that had none of them yet).
insert into stages (project_id, name, order_index)
select p.id, s.name, s.order_index
from projects p
cross join (
  values
    ('Create Pages', 0),
    ('Services', 1),
    ('Contact Details', 2),
    ('Hosting Details', 3)
) as s(name, order_index)
where p.type = 'web_dev'
  and not exists (
    select 1 from stages st where st.project_id = p.id and st.name = s.name
  );
