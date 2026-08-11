-- =============================================================================
-- 0004_seed.sql — reference data
--
-- Idempotent: safe to re-run. Seeds only configuration and the approved habit
-- library, never fake students, assessments or analytics.
--
-- IMPORTANT: every recommendation below is seeded as 'pending_review'. The
-- schema forbids marking a recommendation 'approved' without a source and a
-- named reviewer, and the student app only ever reads approved rows. Nothing
-- medical reaches a student until a human reviewer signs it off.
-- See /docs/MEDICAL_EVIDENCE.md.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Approved registration domains
-- -----------------------------------------------------------------------------
insert into public.approved_email_domains (domain, label, is_active) values
  ('sscbs.du.ac.in', 'Shaheed Sukhdev College of Business Studies', true)
on conflict (domain) do nothing;

-- -----------------------------------------------------------------------------
-- Evidence sources — real publications only. Do not add a row here without
-- checking the URL resolves to the cited document.
-- -----------------------------------------------------------------------------
create unique index if not exists sources_org_title_key
  on public.sources (organization, title);

insert into public.sources (organization, title, url, published_year, notes) values
  (
    'World Health Organization',
    'WHO guidelines on physical activity and sedentary behaviour',
    'https://www.who.int/publications/i/item/9789240015128',
    2020,
    'Global guidance for adults aged 18-64 on activity volume and sedentary time.'
  ),
  (
    'ICMR - National Institute of Nutrition',
    'Dietary Guidelines for Indians',
    'https://main.icmr.nic.in/sites/default/files/upload_documents/DGI_07th_May_2024_fin.pdf',
    2024,
    'Indian dietary guidance, including fluid intake and meal composition.'
  ),
  (
    'FSSAI',
    'Eat Right Campus',
    'https://eatrightindia.gov.in/EatRightCampus/about',
    2021,
    'Operational framework for food safety and healthy eating in Indian campuses.'
  ),
  (
    'American Academy of Sleep Medicine and Sleep Research Society',
    'Recommended Amount of Sleep for a Healthy Adult: A Joint Consensus Statement',
    'https://aasm.org/seven-or-more-hours-of-sleep-per-night-a-health-necessity-for-adults/',
    2015,
    'Consensus that adults should sleep seven or more hours per night.'
  )
on conflict (organization, title) do nothing;

-- -----------------------------------------------------------------------------
-- Recommendations — awaiting medical review
-- -----------------------------------------------------------------------------
insert into public.recommendations (category, recommendation, detail, source_id, review_status)
select
  v.category::public.wellness_category,
  v.recommendation,
  v.detail,
  s.id,
  'pending_review'::public.approval_status
from (values
  (
    'sleep',
    'Adults should regularly sleep seven or more hours per night.',
    'Consensus recommendation for adults aged 18-60 to support general health.',
    'American Academy of Sleep Medicine and Sleep Research Society',
    'Recommended Amount of Sleep for a Healthy Adult: A Joint Consensus Statement'
  ),
  (
    'exercise',
    'Adults should do at least 150-300 minutes of moderate-intensity aerobic activity per week.',
    'Equivalently, 75-150 minutes of vigorous-intensity activity, or a combination.',
    'World Health Organization',
    'WHO guidelines on physical activity and sedentary behaviour'
  ),
  (
    'sitting',
    'Adults should limit the amount of time spent being sedentary.',
    'Replacing sedentary time with physical activity of any intensity provides health benefits.',
    'World Health Organization',
    'WHO guidelines on physical activity and sedentary behaviour'
  ),
  (
    'diet',
    'Base daily meals on a variety of whole foods and limit highly processed, fried and sugary items.',
    'See the cited guidelines for age-appropriate portion guidance for Indian diets.',
    'ICMR - National Institute of Nutrition',
    'Dietary Guidelines for Indians'
  ),
  (
    'hydration',
    'Maintain adequate daily fluid intake, increasing it in hot weather and with physical activity.',
    'Exact requirement varies by body size, climate and activity level.',
    'ICMR - National Institute of Nutrition',
    'Dietary Guidelines for Indians'
  )
) as v(category, recommendation, detail, organization, source_title)
join public.sources s
  on s.organization = v.organization and s.title = v.source_title
where not exists (
  select 1 from public.recommendations r
  where r.recommendation = v.recommendation
);

-- -----------------------------------------------------------------------------
-- Habit library
--
-- These are behaviour targets authored by the chapter, not medical advice.
-- 'approved' here means "approved for use by the product", which is a different
-- gate from the medical review applied to public.recommendations.
-- -----------------------------------------------------------------------------
insert into public.habit_templates
  (category, title, description, difficulty, frequency, target_value, target_unit, points, approval_status, is_active)
select
  v.category::public.wellness_category,
  v.title,
  v.description,
  v.difficulty::public.habit_difficulty,
  v.frequency::public.habit_frequency,
  v.target_value,
  v.target_unit,
  v.points::smallint,
  'approved'::public.approval_status,
  true
from (values
  -- Hydration
  ('hydration', 'Drink 6 glasses of water today', 'Keep a bottle at your desk and finish it twice through the day.', 'basic', 'daily', 6, 'glasses', 10),
  ('hydration', 'Reach 2.5L of water on 3 days', 'Track your intake and hit the target on any three days this week.', 'intermediate', 'weekly', 3, 'days', 20),
  ('hydration', 'Hit your water goal all week, no sugary drinks', 'Meet your daily target every day and swap soft drinks for water.', 'advanced', 'weekly', 7, 'days', 35),
  -- Sleep
  ('sleep', 'No phone 30 minutes before bed', 'Put the phone across the room once you are in bed.', 'basic', 'daily', 30, 'minutes', 10),
  ('sleep', 'Be asleep by 11:30 PM on 3 nights', 'Pick three nights this week and start winding down by 11:00 PM.', 'intermediate', 'weekly', 3, 'nights', 20),
  ('sleep', 'Keep the same bedtime within 30 minutes for 7 days', 'A steady schedule matters as much as total hours.', 'advanced', 'weekly', 7, 'days', 35),
  -- Exercise
  ('exercise', 'Take a 5-minute stretch break while studying', 'Stand up, roll your shoulders, stretch your legs.', 'basic', 'daily', 5, 'minutes', 10),
  ('exercise', 'Go for a 20-minute walk', 'Anywhere counts, including laps of the campus between classes.', 'intermediate', 'daily', 20, 'minutes', 20),
  ('exercise', 'Complete 3 workouts this week', 'Gym, sport, or a long brisk walk all count.', 'advanced', 'weekly', 3, 'sessions', 35),
  -- Diet
  ('diet', 'Skip one fried or packaged snack today', 'Swap it for fruit, nuts or roasted chana.', 'basic', 'daily', 1, 'swaps', 10),
  ('diet', 'Choose a mess or home-style meal over outside food 3 times', 'Aim for three swaps across the week.', 'intermediate', 'weekly', 3, 'meals', 20),
  ('diet', 'Eat 2+ servings of fruit or vegetables daily for a week', 'Add one to lunch and one to dinner.', 'advanced', 'weekly', 7, 'days', 35),
  -- Screen time
  ('screen_time', 'Take a 5-minute screen-free break every 2 hours', 'Look away from every screen, not just your laptop.', 'basic', 'daily', 5, 'minutes', 10),
  ('screen_time', 'Cap non-academic screen time at 2 hours for 3 days', 'Use your phone''s built-in screen time limit.', 'intermediate', 'weekly', 3, 'days', 20),
  ('screen_time', 'Keep non-academic screen time under 2 hours all week', 'Set app limits on the two apps you use most.', 'advanced', 'weekly', 7, 'days', 35),
  -- Sitting and movement
  ('sitting', 'Stand up between study blocks', 'Two minutes on your feet after every study session.', 'basic', 'daily', 1, 'breaks', 10),
  ('sitting', 'Take a movement break every hour for half a day', 'Set an hourly reminder from morning to lunch.', 'intermediate', 'daily', 4, 'breaks', 20),
  ('sitting', 'Take an hourly movement break for a full week', 'Short and frequent beats one long session.', 'advanced', 'weekly', 7, 'days', 35),
  -- Stress (behavioural wind-down only; the app never diagnoses)
  ('stress', 'Take 10 slow breaths before your first class', 'Sixty seconds, sitting still, before the day starts.', 'basic', 'daily', 10, 'breaths', 10),
  ('stress', 'Have a screen-free wind-down on 3 evenings', 'Fifteen minutes without a screen before you sleep.', 'intermediate', 'weekly', 3, 'evenings', 20),
  ('stress', 'Keep a 10-minute daily wind-down for a week', 'Same time, same routine, every night.', 'advanced', 'weekly', 7, 'days', 35)
) as v(category, title, description, difficulty, frequency, target_value, target_unit, points)
where not exists (
  select 1 from public.habit_templates h where h.title = v.title
);

-- Link habits to their evidence source where the category has one.
update public.habit_templates h
set source_id = s.id
from public.sources s
where h.source_id is null
  and (
    (h.category = 'sleep'    and s.organization = 'American Academy of Sleep Medicine and Sleep Research Society')
    or (h.category in ('exercise', 'sitting') and s.organization = 'World Health Organization')
    or (h.category in ('diet', 'hydration')   and s.organization = 'ICMR - National Institute of Nutrition')
  );

-- -----------------------------------------------------------------------------
-- Badges — behaviour and participation only. No badge may reference BMI,
-- weight, stress level or wellness score.
-- -----------------------------------------------------------------------------
insert into public.badges (code, name, description, criteria_type, criteria_value, icon) values
  ('first_checkin',     'First Step',        'Logged your first habit check-in.',              'checkins_total',       1,  'footprints'),
  ('checkins_25',       'Twenty-Five',       'Logged 25 habit check-ins.',                     'checkins_total',       25, 'check-check'),
  ('checkins_100',      'Century',           'Logged 100 habit check-ins.',                    'checkins_total',       100,'trophy'),
  ('streak_7',          'Seven Straight',    'Kept a 7-day check-in streak.',                  'streak_days',          7,  'flame'),
  ('streak_21',         'Three Weeks On',    'Kept a 21-day check-in streak.',                 'streak_days',          21, 'flame'),
  ('baseline_done',     'Starting Line',     'Completed your baseline assessment.',            'assessments_completed',1,  'clipboard-check'),
  ('cycle_complete',    'Cycle Complete',    'Finished a full roadmap cycle.',                 'roadmaps_completed',   1,  'route'),
  ('endline_done',      'Full Circle',       'Completed a follow-up assessment.',              'endline_completed',    1,  'refresh-cw'),
  ('event_first',       'Showed Up',         'Attended your first campus wellness event.',     'events_attended',      1,  'calendar-check'),
  ('event_three',       'Campus Regular',    'Attended three campus wellness events.',         'events_attended',      3,  'users')
on conflict (code) do nothing;
