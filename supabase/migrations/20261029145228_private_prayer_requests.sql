create table public.prayer_requests(id uuid primary key default gen_random_uuid(),church_id uuid not null references public.churches(id),user_id uuid not null default auth.uid(),title text not null check(length(trim(title)) between 2 and 160),body text not null check(length(trim(body)) between 1 and 10000),created_at timestamptz not null default now(),foreign key(church_id,user_id) references public.profiles(church_id,id));
create index prayers_church_user on public.prayer_requests(church_id,user_id);
alter table public.prayer_requests enable row level security;
revoke all on public.prayer_requests from anon,authenticated;
grant select,insert,delete on public.prayer_requests to authenticated;
create policy prayer_read on public.prayer_requests for select to authenticated using(private.can_access(church_id,array['admin','pastor']) or (private.can_access(church_id) and user_id=(select auth.uid())));
create policy prayer_insert on public.prayer_requests for insert to authenticated with check(private.can_access(church_id) and user_id=(select auth.uid()));
create policy prayer_delete on public.prayer_requests for delete to authenticated using(private.can_access(church_id,array['admin','pastor']) or (private.can_access(church_id) and user_id=(select auth.uid())));
