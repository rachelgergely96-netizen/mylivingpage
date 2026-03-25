alter table public.page_views
  drop constraint if exists page_views_primary_section_chk;

alter table public.page_views
  add constraint page_views_primary_section_chk
  check (
    primary_section is null
    or primary_section in (
      'summary',
      'proof',
      'testimonials',
      'experience',
      'projects',
      'education',
      'skills',
      'certifications'
    )
  );

alter table public.page_interactions
  drop constraint if exists page_interactions_target_key_chk;

alter table public.page_interactions
  add constraint page_interactions_target_key_chk
  check (
    target_key in (
      'email',
      'linkedin',
      'github',
      'website',
      'experience_company',
      'project',
      'proof_item'
    )
  );
