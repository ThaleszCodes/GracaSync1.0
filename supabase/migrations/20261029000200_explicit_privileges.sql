revoke all on public.churches,public.profiles,public.ministries,public.announcements,public.events,public.cells,public.tasks,public.finance_entries,public.event_responses,public.audit_log from anon,authenticated;
grant select on public.churches,public.profiles,public.ministries,public.announcements,public.events,public.cells,public.tasks,public.finance_entries,public.event_responses,public.audit_log to authenticated;
grant update(name,city,address,welcome) on public.churches to authenticated;
grant insert,update,delete on public.ministries,public.announcements,public.events,public.cells,public.tasks,public.finance_entries to authenticated;
grant insert,delete on public.event_responses to authenticated;
drop policy audit_read on public.audit_log;
create policy audit_read on public.audit_log for select to authenticated using(private.can_access(church_id,array['admin','pastor']) or (entity='finance_entries' and private.can_access(church_id,array['finance'])));
