-- Removes only the demo/example projects that came from seed.sql
-- ("One Stop Tyres" and "Bright & Co Website Redesign"), along with their
-- stages and tasks (cascaded automatically via the projects -> stages/tasks
-- foreign keys). Any other real projects you've created, plus your
-- business_profile (company name/logo), are left untouched.
--
-- Run in the Supabase SQL Editor (Project > SQL Editor > New query).

delete from projects
where name in ('One Stop Tyres', 'Bright & Co Website Redesign');
