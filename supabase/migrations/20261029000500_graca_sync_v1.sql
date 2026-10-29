begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table public.churches(id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name)) between 2 and 120),city text not null default '',address text not null default '',welcome text not null default 'Que bom ter você aqui!',invite_code text not null unique default upper(encode(extensions.gen_random_bytes(8),'hex')),created_at timestamptz not null default now());
create table public.ministries(id uuid primary key default gen_random_uuid(),church_id uuid not null references public.churches(id),name text not null check(length(trim(name)) between 2 and 100),description text not null default '',created_at timestamptz not null default now(),unique(church_id,id),unique(church_id,name));
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,church_id uuid references public.churches(id),ministry_id uuid,full_name text not null check(length(trim(full_name)) between 2 and 100),member_type text not null default 'visitante' check(member_type in ('visitante','novo_membro','membro')),role text not null default 'member' check(role in ('member','leader','finance','pastor','admin')),created_at timestamptz not null default now(),unique(church_id,id),foreign key(church_id,ministry_id) references public.ministries(church_id,id));
create table public.announcements(id uuid primary key default gen_random_uuid(),church_id uuid not null references public.churches(id),title text not null check(length(trim(title)) between 2 and 160),body text not null check(length(trim(body)) between 1 and 10000),created_at timestamptz not null default now());
create table public.events(id uuid primary key default gen_random_uuid(),church_id uuid not null references public.churches(id),title text not null check(length(trim(title)) between 2 and 160),description text not null default '',location text not null default '',starts_at timestamptz not null,created_at timestamptz not null default now(),unique(church_id,id));
create table public.event_responses(church_id uuid not null,event_id uuid not null,user_id uuid not null,primary key(event_id,user_id),foreign key(church_id,event_id) references public.events(church_id,id) on delete cascade,foreign key(church_id,user_id) references public.profiles(church_id,id));
create table public.cells(id uuid primary key default gen_random_uuid(),church_id uuid not null references public.churches(id),name text not null check(length(trim(name)) between 2 and 100),description text not null default '',location text not null default '',meeting_time text not null default '',created_at timestamptz not null default now());
create table public.tasks(id uuid primary key default gen_random_uuid(),church_id uuid not null references public.churches(id),ministry_id uuid,title text not null check(length(trim(title)) between 2 and 160),description text not null default '',assigned_to uuid,due_date date not null,status text not null default 'pending' check(status in ('pending','done')),created_at timestamptz not null default now(),foreign key(church_id,ministry_id) references public.ministries(church_id,id),foreign key(church_id,assigned_to) references public.profiles(church_id,id));
create table public.finance_entries(id uuid primary key default gen_random_uuid(),church_id uuid not null references public.churches(id),description text not null check(length(trim(description)) between 2 and 200),kind text not null check(kind in ('income','expense')),amount numeric(14,2) not null check(amount>0),category text not null default 'Geral',entry_date date not null default current_date,created_at timestamptz not null default now());
create table public.audit_log(id bigint generated always as identity primary key,church_id uuid not null references public.churches(id),actor_id uuid,action text not null,entity text not null,record_id text not null,old_data jsonb,new_data jsonb,created_at timestamptz not null default now());
create index profiles_ministry on public.profiles(church_id,ministry_id);
create index tasks_assigned on public.tasks(church_id,assigned_to);
create index tasks_ministry on public.tasks(church_id,ministry_id);
create index responses_user on public.event_responses(church_id,user_id);
create index responses_event on public.event_responses(church_id,event_id);
create index events_date on public.events(church_id,starts_at);
create index finance_date on public.finance_entries(church_id,entry_date);
create index audit_church on public.audit_log(church_id,created_at);
create index announcements_church on public.announcements(church_id,created_at);
create index cells_church on public.cells(church_id);

create function private.is_dev() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from auth.users where id=(select auth.uid()) and lower(email)='thaleskaleby24@gmail.com' and email_confirmed_at is not null and deleted_at is null)$$;
create function private.can_access(cid uuid, allowed text[] default array['member','leader','finance','pastor','admin']) returns boolean language sql stable security definer set search_path='' as $$select (select auth.uid()) is not null and (private.is_dev() or exists(select 1 from public.profiles where id=(select auth.uid()) and church_id=cid and role=any(allowed)))$$;
revoke all on function private.is_dev(),private.can_access(uuid,text[]) from public;
grant execute on function private.is_dev(),private.can_access(uuid,text[]) to authenticated;
create function public.is_dev() returns boolean language sql stable security invoker set search_path='' as $$select private.is_dev()$$;
revoke all on function public.is_dev() from public; grant execute on function public.is_dev() to authenticated;

alter table public.churches enable row level security;
create policy church_read on public.churches for select to authenticated using(private.can_access(id));
create policy church_edit on public.churches for update to authenticated using(private.can_access(id,array['admin','pastor'])) with check(private.can_access(id,array['admin','pastor']));
-- Profiles can only be changed through validated RPCs, never a client-side role update.
alter table public.profiles enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()) or private.can_access(church_id,array['admin','pastor','leader']));
do $$declare t text; begin
foreach t in array array['ministries','announcements','events','cells'] loop
execute format('alter table public.%I enable row level security',t);
execute format('create policy read_tenant on public.%I for select to authenticated using(private.can_access(church_id))',t);
execute format('create policy insert_managers on public.%I for insert to authenticated with check(private.can_access(church_id,array[''admin'',''pastor'',''leader'']))',t);
execute format('create policy update_managers on public.%I for update to authenticated using(private.can_access(church_id,array[''admin'',''pastor'',''leader''])) with check(private.can_access(church_id,array[''admin'',''pastor'',''leader'']))',t);
execute format('create policy delete_managers on public.%I for delete to authenticated using(private.can_access(church_id,array[''admin'',''pastor'',''leader'']))',t);
end loop; end$$;
alter table public.tasks enable row level security;
create policy task_read on public.tasks for select to authenticated using(private.can_access(church_id,array['admin','pastor','leader']) or (private.can_access(church_id) and assigned_to=(select auth.uid())));
create policy task_insert on public.tasks for insert to authenticated with check(private.can_access(church_id,array['admin','pastor','leader']));
create policy task_update on public.tasks for update to authenticated using(private.can_access(church_id,array['admin','pastor','leader'])) with check(private.can_access(church_id,array['admin','pastor','leader']));
create policy task_delete on public.tasks for delete to authenticated using(private.can_access(church_id,array['admin','pastor','leader']));
alter table public.finance_entries enable row level security;
create policy finance_read on public.finance_entries for select to authenticated using(private.can_access(church_id,array['admin','pastor','finance']));
create policy finance_insert on public.finance_entries for insert to authenticated with check(private.can_access(church_id,array['admin','pastor','finance']));
create policy finance_update on public.finance_entries for update to authenticated using(private.can_access(church_id,array['admin','pastor','finance'])) with check(private.can_access(church_id,array['admin','pastor','finance']));
create policy finance_delete on public.finance_entries for delete to authenticated using(private.can_access(church_id,array['admin','pastor','finance']));
alter table public.event_responses enable row level security;
create policy response_read on public.event_responses for select to authenticated using(private.can_access(church_id) and (user_id=(select auth.uid()) or private.can_access(church_id,array['admin','pastor','leader'])));
create policy response_insert on public.event_responses for insert to authenticated with check(private.can_access(church_id) and user_id=(select auth.uid()));
create policy response_delete on public.event_responses for delete to authenticated using(private.can_access(church_id) and user_id=(select auth.uid()));
alter table public.audit_log enable row level security;
create policy audit_read on public.audit_log for select to authenticated using(private.can_access(church_id,array['admin','pastor','finance']));
-- Explicit table privileges; no client can write profiles or audit records directly.
grant select on all tables in schema public to authenticated;
grant update(name,city,address,welcome) on public.churches to authenticated;
grant insert,update,delete on public.ministries,public.announcements,public.events,public.cells,public.tasks,public.finance_entries to authenticated;
grant insert,delete on public.event_responses to authenticated;

create function private.bootstrap() returns void language plpgsql security definer set search_path='' as $$begin
if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
insert into public.profiles(id,full_name) select id,left(coalesce(nullif(trim(raw_user_meta_data->>'full_name'),''),'Minha conta'),100) from auth.users where id=auth.uid() on conflict(id) do nothing;
end$$;
create function private.onboard(mode text, church_name text, code text, person_name text, kind text) returns uuid language plpgsql security definer set search_path='' as $$declare cid uuid; begin
perform private.bootstrap();
perform 1 from public.profiles where id=auth.uid() for update;
if exists(select 1 from public.profiles where id=auth.uid() and church_id is not null) then raise exception 'Você já participa de uma igreja.'; end if;
if kind not in ('visitante','novo_membro','membro') then raise exception 'Escolha seu vínculo.'; end if;
if length(trim(person_name)) not between 2 and 100 then raise exception 'Informe seu nome.'; end if;
if mode='create' then insert into public.churches(name) values(trim(church_name)) returning id into cid;
elsif mode='join' then select id into cid from public.churches where invite_code=upper(trim(code)); if cid is null then raise exception 'Código da igreja não encontrado.'; end if;
else raise exception 'Opção inválida.'; end if;
update public.profiles set church_id=cid,full_name=trim(person_name),member_type=kind,role=case when mode='create' then 'admin' else 'member' end where id=auth.uid();
return cid; end$$;
create function private.join_ministry(mid uuid) returns void language plpgsql security definer set search_path='' as $$declare cid uuid; begin
select church_id into cid from public.profiles where id=auth.uid() for update;
if cid is null then raise exception 'Entre em uma igreja primeiro.'; end if;
if mid is not null and not exists(select 1 from public.ministries where id=mid and church_id=cid) then raise exception 'Ministério inválido.'; end if;
update public.profiles set ministry_id=mid where id=auth.uid();
end$$;
create function private.set_role(uid uuid,new_role text) returns void language plpgsql security definer set search_path='' as $$declare cid uuid; old_role text; begin
select church_id,role into cid,old_role from public.profiles where id=uid;
if cid is null or not private.can_access(cid,array['admin','pastor']) then raise exception 'Sem permissão.'; end if;
if new_role not in ('member','leader','finance','pastor','admin') then raise exception 'Cargo inválido.'; end if;
-- Keep at least one administrator. Lock church to serialize concurrent demotions.
perform 1 from public.churches where id=cid for update;
if old_role='admin' and new_role<>'admin' and (select count(*) from public.profiles where church_id=cid and role='admin')<=1 then raise exception 'Mantenha pelo menos um administrador.'; end if;
update public.profiles set role=new_role where id=uid;
end$$;
create function private.complete_task(tid uuid) returns void language plpgsql security definer set search_path='' as $$begin
if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
update public.tasks set status=case when status='done' then 'pending' else 'done' end where id=tid and (private.can_access(church_id,array['admin','pastor','leader']) or (assigned_to=auth.uid() and private.can_access(church_id)));
if not found then raise exception 'Tarefa não encontrada ou sem permissão.'; end if;
end$$;
create function private.update_profile(person_name text,kind text) returns void language plpgsql security definer set search_path='' as $$begin
if auth.uid() is null or kind not in ('visitante','novo_membro','membro') or length(trim(person_name)) not between 2 and 100 then raise exception 'Revise seus dados.'; end if;
update public.profiles set full_name=trim(person_name),member_type=kind where id=auth.uid();
end$$;
-- Thin invoker wrappers expose only intentionally validated operations.
create function public.bootstrap() returns void language sql security invoker set search_path='' as $$select private.bootstrap()$$;
create function public.onboard(mode text,church_name text,code text,person_name text,kind text) returns uuid language sql security invoker set search_path='' as $$select private.onboard(mode,church_name,code,person_name,kind)$$;
create function public.join_ministry(mid uuid) returns void language sql security invoker set search_path='' as $$select private.join_ministry(mid)$$;
create function public.set_role(uid uuid,new_role text) returns void language sql security invoker set search_path='' as $$select private.set_role(uid,new_role)$$;
create function public.complete_task(tid uuid) returns void language sql security invoker set search_path='' as $$select private.complete_task(tid)$$;
create function public.update_profile(person_name text,kind text) returns void language sql security invoker set search_path='' as $$select private.update_profile(person_name,kind)$$;
revoke all on all functions in schema private from public,anon;
grant execute on all functions in schema private to authenticated;
revoke all on function public.bootstrap(),public.onboard(text,text,text,text,text),public.join_ministry(uuid),public.set_role(uuid,text),public.complete_task(uuid),public.update_profile(text,text) from public,anon;
grant execute on function public.bootstrap(),public.onboard(text,text,text,text,text),public.join_ministry(uuid),public.set_role(uuid,text),public.complete_task(uuid),public.update_profile(text,text) to authenticated;
create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$begin
if coalesce(new.church_id,old.church_id) is null then return coalesce(new,old); end if;
insert into public.audit_log(church_id,actor_id,action,entity,record_id,old_data,new_data) values(coalesce(new.church_id,old.church_id),auth.uid(),tg_op,tg_table_name,coalesce(new.id,old.id)::text,case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end);
return coalesce(new,old); end$$;
revoke all on function private.audit_change() from public,anon,authenticated;
do $$declare t text; begin foreach t in array array['profiles','finance_entries','announcements','events','ministries','cells','tasks'] loop execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()',t); end loop; end$$;
commit;
