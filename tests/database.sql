-- Integration/security tests run on the real database in a rolled-back transaction.
begin;
select set_config('test.a',gen_random_uuid()::text,true),set_config('test.b',gen_random_uuid()::text,true),set_config('test.c',gen_random_uuid()::text,true),set_config('test.dev',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
(current_setting('test.a')::uuid,'graca-test-a@example.invalid',now(),'{"full_name":"Admin Teste"}'),
(current_setting('test.b')::uuid,'graca-test-b@example.invalid',now(),'{"full_name":"Outra Igreja"}'),
(current_setting('test.c')::uuid,'graca-test-c@example.invalid',now(),'{"full_name":"Voluntário"}'),
(current_setting('test.dev')::uuid,'thaleskaleby24@gmail.com',null,'{"role":"dev"}');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
select set_config('test.ca',public.onboard('create','Igreja A','','Admin Teste','membro')::text,true);
insert into public.ministries(church_id,name) values(current_setting('test.ca')::uuid,'Mídia'),(current_setting('test.ca')::uuid,'Recepção') on conflict(church_id,name) do nothing;
insert into public.finance_entries(church_id,description,kind,amount) values(current_setting('test.ca')::uuid,'Oferta teste','income',100);
select set_config('request.jwt.claim.sub',current_setting('test.b'),true);
select set_config('test.cb',public.onboard('create','Igreja B','','Outra Igreja','membro')::text,true);
do $$begin
if (select count(*) from public.churches)<>1 then raise exception 'FAIL tenant read'; end if;
if exists(select 1 from public.finance_entries) then raise exception 'FAIL finance isolation'; end if;
begin insert into public.announcements(church_id,title,body) values(current_setting('test.ca')::uuid,'Invasão','Teste'); raise exception 'FAIL tenant write'; exception when insufficient_privilege then null; end;
begin perform public.set_role(current_setting('test.a')::uuid,'member');raise exception 'FAIL cross tenant role';exception when raise_exception then if sqlerrm='FAIL cross tenant role' then raise; end if;end;
end$$;
-- Fetch code as privileged test harness, then join as ordinary member.
reset role;
select set_config('test.code',(select invite_code from public.churches where id=current_setting('test.ca')::uuid),true);
select set_config('test.mid',(select id::text from public.ministries where church_id=current_setting('test.ca')::uuid and name='Mídia'),true);
select set_config('test.mid2',(select id::text from public.ministries where church_id=current_setting('test.ca')::uuid and name='Recepção'),true);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.c'),true);
select public.onboard('join','',current_setting('test.code'),'Voluntário','visitante');
do $$begin begin perform public.join_ministry(current_setting('test.mid')::uuid);raise exception 'FAIL open entry';exception when raise_exception then if sqlerrm='FAIL open entry' then raise;end if;end;end$$;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
select public.assign_ministry(current_setting('test.c')::uuid,current_setting('test.mid')::uuid);
select public.assign_ministry(current_setting('test.c')::uuid,current_setting('test.mid2')::uuid);
select set_config('request.jwt.claim.sub',current_setting('test.c'),true);
do $$begin
if (select ministry_id from public.profiles where id=auth.uid())<>current_setting('test.mid2')::uuid then raise exception 'FAIL single ministry';end if;
if exists(select 1 from public.finance_entries) then raise exception 'FAIL member finance'; end if;
if (select count(*) from public.profiles)<>1 then raise exception 'FAIL people privacy';end if;
begin update public.profiles set role='admin' where id=auth.uid();raise exception 'FAIL self promote';exception when insufficient_privilege then null;end;
begin perform public.set_role(auth.uid(),'admin');raise exception 'FAIL role RPC';exception when raise_exception then if sqlerrm='FAIL role RPC' then raise;end if;end;
begin perform public.onboard('create','Terceira Igreja','','Voluntário','membro');raise exception 'FAIL second church';exception when raise_exception then if sqlerrm='FAIL second church' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
insert into public.tasks(church_id,title,assigned_to,due_date) values(current_setting('test.ca')::uuid,'Preparar recepção',current_setting('test.c')::uuid,current_date);
select public.set_role(current_setting('test.c')::uuid,'finance');
select set_config('request.jwt.claim.sub',current_setting('test.c'),true);
do $$begin if (select count(*) from public.finance_entries)<>1 then raise exception 'FAIL finance role';end if;end$$;
select public.complete_task((select id from public.tasks where assigned_to=auth.uid()));
do $$begin if (select status from public.tasks where assigned_to=auth.uid())<>'done' then raise exception 'FAIL complete task';end if;end$$;
select set_config('request.jwt.claim.sub',current_setting('test.dev'),true);
do $$begin if public.is_dev() then raise exception 'FAIL unconfirmed DEV';end if;end$$;
reset role;
update auth.users set email_confirmed_at=now() where id=current_setting('test.dev')::uuid;
set local role authenticated;
do $$begin if not public.is_dev() then raise exception 'FAIL confirmed DEV';end if;if (select count(*) from public.churches)<>2 then raise exception 'FAIL global DEV access';end if;end$$;
select public.set_role(current_setting('test.c')::uuid,'leader');
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
do $$begin begin perform public.set_role(auth.uid(),'member');raise exception 'FAIL last admin';exception when raise_exception then if sqlerrm='FAIL last admin' then raise;end if;end;end$$;
reset role;
select 'PASS: tenant isolation, roles, single church/ministry, pastoral assignment, finance, tasks, confirmed DEV, last admin protection' as result;
rollback;
