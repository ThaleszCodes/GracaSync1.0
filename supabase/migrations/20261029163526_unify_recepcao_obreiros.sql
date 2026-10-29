create or replace function private.seed_ministries() returns trigger language plpgsql security definer set search_path='' as $$begin
insert into public.ministries(church_id,name,description) select new.id,n,d from (values ('Obreiros','Acolher quem chega e servir no cuidado e na organização dos encontros da igreja.'),('Mídia','Cuidar da comunicação, fotografia, vídeo e transmissão.'),('Infantil','Acompanhar as crianças com cuidado e orientação.'),('Intercessão','Caminhar em oração pela comunidade.'),('Louvor','Servir à comunidade por meio da música.')) as presets(n,d) on conflict(church_id,name) do nothing;return new;end$$;
do $$declare r record; target uuid; begin
for r in select * from public.ministries where name='Recepção' for update loop
select id into target from public.ministries where church_id=r.church_id and name='Obreiros';
if target is null then update public.ministries set name='Obreiros' where id=r.id;
else
update public.profiles set ministry_id=target where church_id=r.church_id and ministry_id=r.id;
update public.tasks set ministry_id=target where church_id=r.church_id and ministry_id=r.id;
delete from public.ministries where id=r.id;
end if;
end loop;
end$$;
