-- Hanmadi: run once in your project's SQL Editor. Re-running preserves records.
-- API defaults may be disabled: only explicit RPCs and selected read tables are granted.
begin;
create schema if not exists hanmadi_private;
revoke all on schema hanmadi_private from public, anon, authenticated;

create table if not exists public.hm_events (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null,
 code text not null unique, settings jsonb not null,
 accepting boolean not null default false, deadline timestamptz, paused_ms bigint,
 prompt integer not null default 1, version integer not null default 1,
 revision bigint not null default 1, updated_at timestamptz not null default now()
);
create table if not exists public.hm_prompts (
 event_id uuid not null references public.hm_events on delete cascade,
 number integer not null, question text not null, guidance text not null default '',
 primary key(event_id,number)
);
create table if not exists public.hm_signals (
 event_id uuid primary key references public.hm_events on delete cascade,
 revision bigint not null default 1
);
create table if not exists public.hm_responses (
 id bigint generated always as identity primary key,
 event_id uuid not null references public.hm_events on delete cascade,
 prompt integer not null, author_id uuid not null, submission_id uuid not null,
 name text not null, body text not null, name_label text not null,
 anonymous boolean not null default false, hidden boolean not null default false,
 pinned boolean not null default false, completed boolean not null default false,
 completed_at timestamptz, created_at timestamptz not null default now(),
 foreign key(event_id,prompt) references public.hm_prompts(event_id,number),
 unique(event_id,submission_id)
);
create index if not exists hm_responses_event on public.hm_responses(event_id,prompt,id);
create table if not exists hanmadi_private.members (
 event_id uuid not null references public.hm_events on delete cascade,
 user_id uuid not null, primary key(event_id,user_id)
);
create table if not exists hanmadi_private.response_details (
 response_id bigint primary key references public.hm_responses on delete cascade,
 participant_id text not null default '', payload jsonb not null
);
create table if not exists hanmadi_private.names (
 event_id uuid not null references public.hm_events on delete cascade,
 name_key text not null, user_id uuid not null, primary key(event_id,name_key)
);
create table if not exists hanmadi_private.votes (
 response_id bigint not null references public.hm_responses on delete cascade,
 user_id uuid not null, emoji text not null,
 primary key(response_id,user_id,emoji),
 check(emoji in ('up','heart','clap','eyes','idea','celebrate'))
);

create or replace function public.hm_can_access(p_event uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
 exists(select 1 from public.hm_events where id=p_event and owner_id=auth.uid()) or
 exists(select 1 from hanmadi_private.members where event_id=p_event and user_id=auth.uid()));
$$;
alter table public.hm_events enable row level security;
alter table public.hm_prompts enable row level security;
alter table public.hm_responses enable row level security;
alter table public.hm_signals enable row level security;
alter table hanmadi_private.members enable row level security;
alter table hanmadi_private.response_details enable row level security;
alter table hanmadi_private.names enable row level security;
alter table hanmadi_private.votes enable row level security;
drop policy if exists hm_read on public.hm_events;
create policy hm_read on public.hm_events for select to authenticated using(public.hm_can_access(id));
drop policy if exists hm_read on public.hm_prompts;
create policy hm_read on public.hm_prompts for select to authenticated using(public.hm_can_access(event_id));
drop policy if exists hm_read on public.hm_responses;
create policy hm_read on public.hm_responses for select to authenticated using (
 public.hm_can_access(event_id) and (not hidden or exists(select 1 from public.hm_events where id=event_id and owner_id=auth.uid())));
drop policy if exists hm_read on public.hm_signals;
create policy hm_read on public.hm_signals for select to authenticated using(public.hm_can_access(event_id));
revoke all on public.hm_events,public.hm_prompts,public.hm_responses,public.hm_signals from anon,authenticated;
grant select on public.hm_events,public.hm_prompts,public.hm_responses,public.hm_signals to authenticated;

-- Small notifications avoid repeating a large logo and cover updates to newly hidden rows.
create or replace function hanmadi_private.signal_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare eid uuid;
begin
 if tg_table_name='hm_events' then eid:=new.id; else eid:=coalesce(new.event_id,old.event_id); end if;
 if exists(select 1 from public.hm_events where id=eid) then
   insert into public.hm_signals(event_id) values(eid) on conflict(event_id) do update set revision=public.hm_signals.revision+1;
 end if;
 return null;
end $$;
drop trigger if exists hm_signal on public.hm_events;
create trigger hm_signal after insert or update on public.hm_events for each row execute function hanmadi_private.signal_change();
drop trigger if exists hm_signal on public.hm_responses;
create trigger hm_signal after insert or update or delete on public.hm_responses for each row execute function hanmadi_private.signal_change();

create or replace function hanmadi_private.clean_settings(s jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare result jsonb;
begin
 if s is null or jsonb_typeof(s)<>'object' or octet_length(s::text)>3000000 or
 length(btrim(coalesce(s->>'title','')))=0 or length(s->>'title')>80 or
 length(btrim(coalesce(s->>'question','')))=0 or length(s->>'question')>500 or
 length(coalesce(s->>'guidance',''))>1500 or length(btrim(coalesce(s->>'nameLabel','')))=0 or length(s->>'nameLabel')>30 then raise exception 'INVALID_SETTINGS'; end if;
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into result from jsonb_each(s)
 where key=any(array['title','question','guidance','nameLabel','nameExample','required','anonymous','color','brandCustom','logo','logoBg','view','fontChoice','fontCustom','appearance','locale','spacePalette','planetColors','react','emojiByView','sort','timerEnabled','timerMinutes','timerSeconds']);
 return result;
end $$;

create or replace function public.hm_create(p_code text,p_settings jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare eid uuid; s jsonb;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'HOST_LOGIN_REQUIRED'; end if;
 if p_code !~ '^[a-f0-9]{32}$' then raise exception 'INVALID_CODE'; end if;
 s:=hanmadi_private.clean_settings(p_settings);
 insert into public.hm_events(owner_id,code,settings) values(auth.uid(),p_code,s) returning id into eid;
 insert into public.hm_prompts values(eid,1,s->>'question',coalesce(s->>'guidance',''));
 return eid;
end $$;

create or replace function public.hm_join(p_code text) returns uuid
language plpgsql security definer set search_path='' as $$
declare eid uuid;
begin
 if auth.uid() is null then raise exception 'LOGIN_REQUIRED'; end if;
 select id into eid from public.hm_events where code=p_code;
 if eid is null then raise exception 'EVENT_NOT_FOUND'; end if;
 insert into hanmadi_private.members values(eid,auth.uid()) on conflict do nothing;
 return eid;
end $$;

create or replace function public.hm_snapshot(p_event uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare e public.hm_events; host boolean; result jsonb;
begin
 if not public.hm_can_access(p_event) then raise exception 'FORBIDDEN'; end if;
 select * into e from public.hm_events where id=p_event; host:=e.owner_id=auth.uid();
 select jsonb_build_object('event_id',e.id,'code',e.code,'settings',e.settings,
 'accept',e.accepting and (e.deadline is null or e.deadline>now()),'deadline',e.deadline,
 'paused_ms',e.paused_ms,'prompt',e.prompt,'version',e.version,'revision',e.revision,
 'host',host,'server_now',now(),
 'prompts',coalesce((select jsonb_agg(jsonb_build_object('id',number,'question',question,'guidance',guidance) order by number) from public.hm_prompts where event_id=e.id),'[]'),
 'responses',coalesce((select jsonb_agg(jsonb_build_object(
   'id',r.id,'prompt',r.prompt,'name',r.name,'text',r.body,'createdAt',r.created_at,
   'hidden',r.hidden,'pinned',r.pinned,'completed',r.completed,'completedAt',r.completed_at,
   'nameLabel',r.name_label,'anonymous',r.anonymous,
   'participantId',case when host then (select participant_id from hanmadi_private.response_details where response_id=r.id) else null end,
   'up',(select count(*) from hanmadi_private.votes where response_id=r.id and emoji='up'),
   'heart',(select count(*) from hanmadi_private.votes where response_id=r.id and emoji='heart'),
   'votedUp',exists(select 1 from hanmadi_private.votes where response_id=r.id and emoji='up' and user_id=auth.uid()),
   'votedHeart',exists(select 1 from hanmadi_private.votes where response_id=r.id and emoji='heart' and user_id=auth.uid()),
   'extras',coalesce((select jsonb_object_agg(emoji,n) from (select emoji,count(*) n from hanmadi_private.votes where response_id=r.id and emoji not in ('up','heart') group by emoji) v),'{}'),
   'extraVotes',coalesce((select jsonb_object_agg(emoji,true) from hanmadi_private.votes where response_id=r.id and user_id=auth.uid() and emoji not in ('up','heart')),'{}')
 ) order by r.id) from public.hm_responses r where r.event_id=e.id and (host or not r.hidden)),'[]')) into result;
 return result;
end $$;

create or replace function public.hm_submit(p_event uuid,p_submission uuid,p_prompt integer,p_name text,p_body text,p_participant text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.hm_events; old public.hm_responses; rid bigint; stamp timestamptz; payload jsonb; namekey text; reserved uuid;
begin
 if not public.hm_can_access(p_event) then raise exception 'FORBIDDEN'; end if;
 if p_submission is null or p_prompt is null or p_name is null or p_body is null or length(btrim(p_name))=0 or length(p_name)>50 or length(btrim(p_body))=0 or length(p_body)>1000 or length(coalesce(p_participant,''))>100 then raise exception 'INVALID_INPUT'; end if;
 payload:=jsonb_build_array(auth.uid(),p_prompt,btrim(p_name),btrim(p_body),coalesce(p_participant,''));
 select * into e from public.hm_events where id=p_event for update;
 select * into old from public.hm_responses where event_id=p_event and submission_id=p_submission;
 if found then
   if old.author_id<>auth.uid() or (select d.payload from hanmadi_private.response_details d where response_id=old.id)<>payload then raise exception 'RETRY_MISMATCH'; end if;
   return jsonb_build_object('ok',true,'id',old.id,'created_at',old.created_at,'duplicate',true);
 end if;
 if not e.accepting or (e.deadline is not null and e.deadline<=now()) then raise exception 'SUBMISSIONS_CLOSED'; end if;
 if e.prompt<>p_prompt then raise exception 'QUESTION_CHANGED'; end if;
 if coalesce((e.settings->>'anonymous')::boolean,false) then
   namekey:=regexp_replace(translate(lower(normalize(btrim(p_name),NFKC)),chr(8203)||chr(8204)||chr(8205)||chr(65279),''),'\s+','','g');
   if namekey='' then raise exception 'INVALID_INPUT'; end if;
   insert into hanmadi_private.names values(e.id,namekey,auth.uid()) on conflict do nothing;
   select user_id into reserved from hanmadi_private.names where event_id=e.id and name_key=namekey;
   if reserved<>auth.uid() then raise exception 'NAME_TAKEN'; end if;
 end if;
 insert into public.hm_responses(event_id,prompt,author_id,submission_id,name,body,name_label,anonymous)
 values(e.id,p_prompt,auth.uid(),p_submission,btrim(p_name),btrim(p_body),e.settings->>'nameLabel',coalesce((e.settings->>'anonymous')::boolean,false)) returning id,created_at into rid,stamp;
 insert into hanmadi_private.response_details values(rid,coalesce(p_participant,''),payload);
 return jsonb_build_object('ok',true,'id',rid,'created_at',stamp,'duplicate',false);
end $$;

create or replace function public.hm_vote(p_response bigint,p_emoji text,p_active boolean) returns void
language plpgsql security definer set search_path='' as $$
declare r public.hm_responses; e public.hm_events;
begin
 select * into r from public.hm_responses where id=p_response;
 if r.id is null or not public.hm_can_access(r.event_id) then raise exception 'FORBIDDEN'; end if;
 select * into e from public.hm_events where id=r.event_id for update;
 if r.hidden or r.completed or r.prompt<>e.prompt or not coalesce((e.settings->>'react')::boolean,true) then raise exception 'REACTIONS_CLOSED'; end if;
 if p_emoji not in ('up','heart','clap','eyes','idea','celebrate') or p_active is null then raise exception 'INVALID_INPUT'; end if;
 if p_active then insert into hanmadi_private.votes values(r.id,auth.uid(),p_emoji) on conflict do nothing;
 else delete from hanmadi_private.votes where response_id=r.id and user_id=auth.uid() and emoji=p_emoji; end if;
 update public.hm_events set updated_at=clock_timestamp() where id=e.id;
end $$;

create or replace function public.hm_update(p_event uuid,p_revision bigint,p_settings jsonb,p_accept boolean,p_deadline timestamptz default null,p_paused_ms bigint default null) returns bigint
language plpgsql security definer set search_path='' as $$
declare e public.hm_events; s jsonb;
begin
 select * into e from public.hm_events where id=p_event for update;
 if e.id is null or auth.uid() is null or e.owner_id<>auth.uid() then raise exception 'FORBIDDEN'; end if;
 if e.revision<>p_revision then raise exception 'STALE_EVENT'; end if;
 if p_accept is null or (p_paused_ms is not null and (p_paused_ms<1 or p_paused_ms>10800000 or p_accept or p_deadline is not null)) then raise exception 'INVALID_INPUT'; end if;
 if p_deadline is not null and (p_deadline>now()+interval '181 minutes') then raise exception 'INVALID_INPUT'; end if;
 s:=hanmadi_private.clean_settings(p_settings);
 update public.hm_prompts set question=s->>'question',guidance=coalesce(s->>'guidance','') where event_id=e.id and number=e.prompt;
 update public.hm_events set settings=s,accepting=p_accept,deadline=p_deadline,paused_ms=p_paused_ms,version=version+case when jsonb_build_array(settings->'question',settings->'guidance',settings->'nameLabel',settings->'anonymous',settings->'required') is distinct from jsonb_build_array(s->'question',s->'guidance',s->'nameLabel',s->'anonymous',s->'required') then 1 else 0 end,revision=revision+1,updated_at=clock_timestamp() where id=e.id returning revision into e.revision;
 return e.revision;
end $$;

create or replace function public.hm_moderate(p_response bigint,p_action text,p_active boolean) returns void
language plpgsql security definer set search_path='' as $$
declare r public.hm_responses;
begin
 select * into r from public.hm_responses where id=p_response;
 if r.id is null or auth.uid() is null or not exists(select 1 from public.hm_events where id=r.event_id and owner_id=auth.uid()) then raise exception 'FORBIDDEN'; end if;
 if p_action not in ('hidden','pinned','completed') or p_active is null then raise exception 'INVALID_INPUT'; end if;
 update public.hm_responses set hidden=case when p_action='hidden' then p_active else hidden end,pinned=case when p_action='pinned' then p_active else pinned end,completed=case when p_action='completed' then p_active else completed end,completed_at=case when p_action='completed' then case when p_active then now() else null end else completed_at end where id=r.id;
end $$;

create or replace function public.hm_next(p_event uuid,p_question text,p_guidance text,p_label text default null) returns integer
language plpgsql security definer set search_path='' as $$
declare e public.hm_events; nextno integer;
begin
 select * into e from public.hm_events where id=p_event for update;
 if e.id is null or auth.uid() is null or e.owner_id<>auth.uid() then raise exception 'FORBIDDEN'; end if;
 if length(btrim(coalesce(p_question,'')))=0 or length(p_question)>500 or length(coalesce(p_guidance,''))>1500 or (p_label is not null and (length(btrim(p_label))=0 or length(p_label)>30)) then raise exception 'INVALID_INPUT'; end if;
 nextno:=e.prompt+1;
 insert into public.hm_prompts values(e.id,nextno,btrim(p_question),coalesce(p_guidance,''));
 update public.hm_events set prompt=nextno,version=version+1,revision=revision+1,accepting=false,deadline=null,paused_ms=null,settings=jsonb_set(jsonb_set(jsonb_set(settings,'{question}',to_jsonb(btrim(p_question))),'{guidance}',to_jsonb(coalesce(p_guidance,''))),'{nameLabel}',to_jsonb(coalesce(btrim(p_label),settings->>'nameLabel'))),updated_at=clock_timestamp() where id=e.id;
 return nextno;
end $$;

-- Revoke PostgreSQL's implicit PUBLIC EXECUTE, then grant only the app RPCs.
revoke all on all functions in schema hanmadi_private from public,anon,authenticated;
revoke all on function public.hm_can_access(uuid),public.hm_create(text,jsonb),public.hm_join(text),public.hm_snapshot(uuid),public.hm_submit(uuid,uuid,integer,text,text,text),public.hm_vote(bigint,text,boolean),public.hm_update(uuid,bigint,jsonb,boolean,timestamptz,bigint),public.hm_moderate(bigint,text,boolean),public.hm_next(uuid,text,text,text) from public,anon;
grant execute on function public.hm_can_access(uuid),public.hm_create(text,jsonb),public.hm_join(text),public.hm_snapshot(uuid),public.hm_submit(uuid,uuid,integer,text,text,text),public.hm_vote(bigint,text,boolean),public.hm_update(uuid,bigint,jsonb,boolean,timestamptz,bigint),public.hm_moderate(bigint,text,boolean),public.hm_next(uuid,text,text,text) to authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
   if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='hm_events') then alter publication supabase_realtime drop table public.hm_events; end if;
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='hm_signals') then alter publication supabase_realtime add table public.hm_signals; end if;
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='hm_responses') then alter publication supabase_realtime add table public.hm_responses; end if;
 end if;
end $$;
notify pgrst,'reload schema';
commit;
