-- Optional demo data — mirrors the example projects the app used to ship with
-- in-memory. Run this after schema.sql if you want to start with sample data
-- instead of an empty dashboard. Safe to skip entirely.

with new_project as (
  insert into projects (name, client, client_details, type, description, color, start_date, end_date, website_url)
  values (
    'One Stop Tyres',
    'One Stop Tyres Ltd',
    '{"name":"James Carter","company":"One Stop Tyres Ltd","email":"james@onestoptyres.co.uk","phone":"+44 7700 900123","notes":"Prefers weekly ranking updates over email."}',
    'seo',
    'Full SEO overhaul: on-page, technical SEO and off-page link building.',
    '#33d485',
    '2026-06-01',
    '2026-09-30',
    'https://www.onestoptyres.co.uk'
  )
  returning id
),
new_stages as (
  insert into stages (project_id, name, order_index)
  select id, stage_name, stage_order
  from new_project,
    (values
      ('On-Page SEO', 0),
      ('Technical SEO', 1),
      ('Off-Page SEO', 2),
      ('Social Media', 3),
      ('Google Business Profile', 4)
    ) as s(stage_name, stage_order)
  returning id, project_id, name
)
insert into tasks (project_id, stage_id, title, status, priority, scheduled_for)
select
  s.project_id,
  s.id,
  t.title,
  t.status,
  t.priority,
  t.scheduled_for
from new_stages s
join (
  values
    ('On-Page SEO', 'Compile core keyword list', 'done', 'high', null),
    ('On-Page SEO', 'Optimize title tags & meta descriptions', 'done', 'high', null),
    ('On-Page SEO', 'Add internal linking to category pages', 'in_progress', 'high', 'today'),
    ('On-Page SEO', 'Optimize image alt text site-wide', 'todo', 'medium', null),
    ('Technical SEO', 'Fix duplicate title tags', 'done', 'high', null),
    ('Technical SEO', 'Submit updated sitemap to Search Console', 'todo', 'medium', 'today'),
    ('Technical SEO', 'Improve Core Web Vitals (LCP)', 'todo', 'high', null),
    ('Off-Page SEO', 'Outreach to 10 local directories', 'done', 'medium', null),
    ('Off-Page SEO', 'Guest post on tyre industry blog', 'in_progress', 'medium', null),
    ('Off-Page SEO', 'Follow up with 5 pending link partners', 'todo', 'low', 'today'),
    ('Social Media', 'Post monthly tyre-care tips on Facebook', 'todo', 'low', null),
    ('Google Business Profile', 'Update opening hours & add new photos', 'todo', 'medium', null),
    ('Google Business Profile', 'Respond to 3 pending customer reviews', 'in_progress', 'medium', 'today')
) as t(stage_name, title, status, priority, scheduled_for) on t.stage_name = s.name;

with new_project as (
  insert into projects (
    name, client, client_details, type, description, color, start_date, end_date, website_url, web_details
  )
  values (
    'Bright & Co Website Redesign',
    'Bright & Co',
    '{"name":"Alicia Bright","company":"Bright & Co","email":"alicia@brightandco.com","phone":"+1 415 555 0148","notes":"Wants a staging link before every milestone review."}',
    'web_dev',
    'Rebuild the marketing site on Next.js with a booking flow.',
    '#4fc3e0',
    '2026-07-01',
    '2026-08-20',
    'https://www.brightandco.com',
    '{"websiteName":"Bright & Co","websiteUrl":"https://www.brightandco.com","domainStatus":"purchased","logoUrl":"https://www.brightandco.com/logo.svg","siteIconUrl":"https://www.brightandco.com/favicon.ico","openGraphImageUrl":"https://www.brightandco.com/og-cover.png","servicesDetails":"Marketing site + online booking flow + payment integration.","hostingDetails":"Vercel (Pro plan), domain via Namecheap.","contactDetails":"Alicia Bright — alicia@brightandco.com — +1 415 555 0148","notes":"Client owns the domain already; we manage hosting and deploys."}'
  )
  returning id
),
new_stages as (
  insert into stages (project_id, name, order_index)
  select id, stage_name, stage_order
  from new_project,
    (values
      ('Discovery', 0),
      ('Design / Wireframes', 1),
      ('Frontend Development', 2),
      ('Backend Development', 3),
      ('Testing & QA', 4),
      ('Deployment', 5),
      ('Client Review', 6),
      ('Maintenance', 7)
    ) as s(stage_name, stage_order)
  returning id, project_id, name
)
insert into tasks (project_id, stage_id, title, status, priority, scheduled_for)
select
  s.project_id,
  s.id,
  t.title,
  t.status,
  t.priority,
  t.scheduled_for
from new_stages s
join (
  values
    ('Discovery', 'Client kickoff call & requirements doc', 'done', 'high', null),
    ('Design / Wireframes', 'Homepage + booking flow wireframes', 'done', 'high', null),
    ('Design / Wireframes', 'Get sign-off on final UI design', 'in_progress', 'high', 'today'),
    ('Frontend Development', 'Build homepage in Next.js', 'todo', 'high', null),
    ('Frontend Development', 'Build booking form component', 'todo', 'medium', null),
    ('Backend Development', 'Set up booking API + email notifications', 'todo', 'medium', null),
    ('Testing & QA', 'Cross-browser & mobile testing', 'todo', 'low', null),
    ('Deployment', 'Deploy to production & connect domain', 'todo', 'medium', null)
) as t(stage_name, title, status, priority, scheduled_for) on t.stage_name = s.name;
