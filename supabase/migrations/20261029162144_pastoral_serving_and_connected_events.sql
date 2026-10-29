alter table public.churches add column pastor_whatsapp text not null default '' check(pastor_whatsapp='' or pastor_whatsapp ~ '^[1-9][0-9]{9,14}$'),add column pastor_name text not null default '',add column cover_url text not null default '' check(cover_url='' or cover_url like 'https://oywdpselqqzvfqmwnfxv.supabase.co/storage/v1/object/public/church-branding/%'),add column logo_url text not null default '' check(logo_url='' or logo_url like 'https://oywdpselqqzvfqmwnfxv.supabase.co/storage/v1/object/public/church-branding/%');
grant update(pastor_whatsapp,pastor_name,cover_url,logo_url) on public.churches to authenticated;
alter table public.tasks add column event_id uuid,add foreign key(church_id,event_id) references public.events(church_id,id);
create index tasks_event on public.tasks(church_id,event_id);
create or replace function private.join_ministry(mid uuid) returns void language plpgsql security definer set search_path='' as $$begin raise exception 'A participação em ministérios é definida após conversa com os pastores. Procure a liderança da sua igreja.';end$$;
create function private.assign_ministry(uid uuid,mid uuid) returns void language plpgsql security definer set search_path='' as $$declare cid uuid;begin
select church_id into cid from public.profiles where id=uid for update;
if cid is null or not private.can_access(cid,array['admin','pastor']) then raise exception 'Somente pastores e administradores podem definir ministérios.';end if;
if mid is not null and not exists(select 1 from public.ministries where id=mid and church_id=cid) then raise exception 'Ministério de outra igreja ou inexistente.';end if;
update public.profiles set ministry_id=mid where id=uid;
end$$;
revoke all on function private.assign_ministry(uuid,uuid) from public,anon;grant execute on function private.assign_ministry(uuid,uuid) to authenticated;
create function public.assign_ministry(uid uuid,mid uuid) returns void language sql security invoker set search_path='' as $$select private.assign_ministry(uid,mid)$$;
revoke all on function public.assign_ministry(uuid,uuid) from public,anon;grant execute on function public.assign_ministry(uuid,uuid) to authenticated;
create function private.seed_ministries() returns trigger language plpgsql security definer set search_path='' as $$begin
insert into public.ministries(church_id,name,description) select new.id,n,d from (values ('Recepção','Acolher quem chega e ajudar cada pessoa a se sentir em casa.'),('Obreiros','Servir no cuidado e na organização dos encontros da igreja.'),('Mídia','Cuidar da comunicação, fotografia, vídeo e transmissão.'),('Infantil','Acompanhar as crianças com cuidado e orientação.'),('Intercessão','Caminhar em oração pela comunidade.'),('Louvor','Servir à comunidade por meio da música.')) as presets(n,d) on conflict(church_id,name) do nothing;return new;end$$;
revoke all on function private.seed_ministries() from public,anon,authenticated;
create trigger seed_ministries after insert on public.churches for each row execute function private.seed_ministries();
insert into public.ministries(church_id,name,description) select c.id,n,d from public.churches c cross join (values ('Recepção','Acolher quem chega e ajudar cada pessoa a se sentir em casa.'),('Obreiros','Servir no cuidado e na organização dos encontros da igreja.'),('Mídia','Cuidar da comunicação, fotografia, vídeo e transmissão.'),('Infantil','Acompanhar as crianças com cuidado e orientação.'),('Intercessão','Caminhar em oração pela comunidade.'),('Louvor','Servir à comunidade por meio da música.')) as presets(n,d) on conflict(church_id,name) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('church-branding','church-branding',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy church_brand_insert on storage.objects for insert to authenticated with check(bucket_id='church-branding' and private.can_access(case when (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$' then ((storage.foldername(name))[1])::uuid else null end,array['admin','pastor']));
create policy church_brand_read on storage.objects for select to authenticated using(bucket_id='church-branding' and private.can_access(case when (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$' then ((storage.foldername(name))[1])::uuid else null end,array['admin','pastor']));

