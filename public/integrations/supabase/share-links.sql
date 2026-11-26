-- Install once in the Supabase project used by this site's shared-link directory.
-- This can be the same project as the survey backend. Existing surveys are preserved.
begin;
create schema if not exists hanmadi_private;
revoke all on schema hanmadi_private from public,anon,authenticated;
create table if not exists hanmadi_private.link_publishers(user_id uuid primary key);
create table if not exists hanmadi_private.short_links(
 alias text primary key check(alias ~ '^[A-Za-z0-9_-]{20}$'),
 site text not null, identity_hash bytea not null unique,
 target jsonb not null, owner_id uuid not null, updated_at timestamptz not null default now()
);
alter table hanmadi_private.link_publishers enable row level security;
alter table hanmadi_private.short_links enable row level security;
revoke all on hanmadi_private.link_publishers,hanmadi_private.short_links from public,anon,authenticated;

create or replace function public.hm_register_short_link(p_site text,p_target jsonb) returns text
language plpgsql security definer set search_path='' as $$
declare t jsonb; kind text; endpoint text; code text; fingerprint bytea; alias_value text; existing hanmadi_private.short_links%rowtype;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or
 not exists(select 1 from hanmadi_private.link_publishers where user_id=auth.uid()) then raise exception 'LINK_PUBLISHER_REQUIRED'; end if;
 if p_site is null or length(p_site)>1000 or p_site !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?/[^?#[:space:]]*$' then raise exception 'INVALID_LINK_SITE'; end if;
 if p_target is null or jsonb_typeof(p_target)<>'object' or octet_length(p_target::text)>4096 then raise exception 'INVALID_LINK_TARGET'; end if;
 kind=p_target->>'provider'; code=p_target->>'code';
 if code is null or code !~ '^[A-Za-z0-9_-]{1,64}$' then raise exception 'INVALID_LINK_TARGET'; end if;
 if kind='supabase' then
  endpoint=p_target->>'url';
  if endpoint is null or endpoint !~ '^https://[a-z0-9]{12,40}\.supabase\.co$' or
   coalesce(p_target->>'key','') !~ '^sb_publishable_[A-Za-z0-9_-]{10,200}$' then raise exception 'INVALID_LINK_TARGET'; end if;
  t=jsonb_build_object('provider',kind,'url',endpoint,'key',p_target->>'key','code',code);
 elsif kind='sheets' then
  endpoint=p_target->>'endpoint';
  if endpoint is null or endpoint !~ '^https://script\.google\.com/macros/s/[A-Za-z0-9_-]{20,200}/exec$' then raise exception 'INVALID_LINK_TARGET'; end if;
  t=jsonb_build_object('provider',kind,'endpoint',endpoint,'code',code);
 else raise exception 'INVALID_LINK_TARGET'; end if;
 fingerprint=pg_catalog.sha256(pg_catalog.convert_to(p_site||E'\n'||kind||E'\n'||endpoint||E'\n'||code,'UTF8'));
 alias_value=translate(encode(substring(fingerprint from 1 for 15),'base64'),'+/','-_');
 -- A collision never changes somebody else's destination. The full hash is retained.
 insert into hanmadi_private.short_links(alias,site,identity_hash,target,owner_id)
 values(alias_value,p_site,fingerprint,t,auth.uid()) on conflict do nothing;
 select * into existing from hanmadi_private.short_links where alias=alias_value for update;
 if existing.identity_hash is distinct from fingerprint then raise exception 'LINK_ID_COLLISION'; end if;
 if existing.owner_id<>auth.uid() then raise exception 'LINK_OWNER_REQUIRED'; end if;
 update hanmadi_private.short_links set target=t,updated_at=now() where alias=alias_value;
 return alias_value;
end $$;

create or replace function public.hm_resolve_short_link(p_site text,p_alias text) returns jsonb
language sql stable security definer set search_path='' as $$
 select target from hanmadi_private.short_links
 where alias=p_alias and site=p_site and p_alias ~ '^[A-Za-z0-9_-]{20}$'
$$;
revoke all on function public.hm_register_short_link(text,jsonb),public.hm_resolve_short_link(text,text) from public,anon,authenticated;
grant execute on function public.hm_register_short_link(text,jsonb) to authenticated;
grant execute on function public.hm_resolve_short_link(text,text) to anon,authenticated;

-- The generated installer adds the selected operator's Auth user ID below.
-- Public and anonymous clients cannot grant themselves publishing permission.
/*__HANMADI_LINK_PUBLISHER__*/
commit;
