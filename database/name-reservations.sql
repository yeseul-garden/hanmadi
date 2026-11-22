-- Reference migration for the future server, not applied to a running database.
-- PostgreSQL 15+ with UTF8 encoding. Only a trusted backend may call these
-- functions, using event/participant IDs from a verified session, never form IDs.
-- Reservation rows are kept for the lifetime of the event, including old names.
BEGIN;

CREATE SCHEMA IF NOT EXISTS seminar_names;
REVOKE ALL ON SCHEMA seminar_names FROM PUBLIC;

CREATE OR REPLACE FUNCTION seminar_names.name_key(p_name text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
SET search_path = pg_catalog AS $$
  SELECT lower(regexp_replace(normalize(p_name, NFKC),
    '[[:space:]' || chr(8203) || chr(8204) || chr(8205) || chr(65279) || ']', '', 'g'));
$$;

CREATE TABLE IF NOT EXISTS seminar_names.claims (
  claim_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id uuid NOT NULL,
  participant_id uuid NOT NULL,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 50),
  is_anonymous boolean NOT NULL DEFAULT false,
  name_key text GENERATED ALWAYS AS (seminar_names.name_key(display_name)) STORED,
  claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT name_key_not_empty CHECK (name_key <> ''),
  CONSTRAINT one_owner_per_event_name UNIQUE (event_id, name_key)
);
CREATE INDEX IF NOT EXISTS claims_by_participant
  ON seminar_names.claims (event_id, participant_id, claim_id DESC);

CREATE TABLE IF NOT EXISTS seminar_names.alias_pool (
  pool_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  display_name text NOT NULL UNIQUE
);

CREATE OR REPLACE FUNCTION seminar_names.claim_display_name(
  p_event uuid, p_participant uuid, p_name text, p_anonymous boolean DEFAULT false
) RETURNS text LANGUAGE plpgsql
SET search_path = pg_catalog, seminar_names AS $$
DECLARE
  v_name text := btrim(p_name);
  v_key text;
  v_owner uuid;
  v_count integer;
BEGIN
  IF p_event IS NULL OR p_participant IS NULL OR v_name IS NULL
     OR char_length(v_name) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'invalid_name' USING ERRCODE = '22023';
  END IF;
  v_key := seminar_names.name_key(v_name);
  IF v_key = '' THEN RAISE EXCEPTION 'invalid_name' USING ERRCODE = '22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_event::text || ':' || p_participant::text, 0));
  INSERT INTO seminar_names.claims(event_id, participant_id, display_name, is_anonymous)
    VALUES (p_event, p_participant, v_name, coalesce(p_anonymous, false))
    ON CONFLICT (event_id, name_key) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 1 THEN RETURN v_name; END IF;
  SELECT participant_id INTO v_owner FROM seminar_names.claims
    WHERE event_id = p_event AND name_key = v_key;
  IF v_owner = p_participant THEN
    IF coalesce(p_anonymous, false) THEN
      UPDATE seminar_names.claims SET is_anonymous = true
        WHERE event_id = p_event AND name_key = v_key;
    END IF;
    RETURN v_name;
  END IF;
  RAISE EXCEPTION 'name_taken' USING ERRCODE = '23505';
END;
$$;

CREATE OR REPLACE FUNCTION seminar_names.reserve_anonymous_name(
  p_event uuid, p_participant uuid
) RETURNS text LANGUAGE plpgsql
SET search_path = pg_catalog, seminar_names AS $$
DECLARE
  v_name text;
  v_existing text;
  v_capacity bigint;
  v_start bigint;
  v_count integer;
BEGIN
  IF p_event IS NULL OR p_participant IS NULL THEN
    RAISE EXCEPTION 'invalid_participant' USING ERRCODE = '22023';
  END IF;
  -- Serialise retries for the same participant, not the entire event.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_event::text || ':' || p_participant::text, 0));
  SELECT display_name INTO v_existing FROM seminar_names.claims
    WHERE event_id = p_event AND participant_id = p_participant AND is_anonymous
    ORDER BY claim_id DESC LIMIT 1;
  IF FOUND THEN RETURN v_existing; END IF;
  SELECT count(*) INTO v_capacity FROM seminar_names.alias_pool;
  IF v_capacity = 0 THEN RAISE EXCEPTION 'alias_pool_not_seeded'; END IF;
  v_start := floor(random() * v_capacity)::bigint;
  FOR v_name IN SELECT display_name FROM seminar_names.alias_pool
    ORDER BY mod(pool_id + v_capacity - v_start, v_capacity)
  LOOP
    INSERT INTO seminar_names.claims(event_id, participant_id, display_name, is_anonymous)
      VALUES (p_event, p_participant, v_name, true)
      ON CONFLICT (event_id, name_key) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count = 1 THEN RETURN v_name; END IF;
  END LOOP;
  RAISE EXCEPTION 'alias_pool_exhausted' USING ERRCODE = '54000';
END;
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA seminar_names FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA seminar_names FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA seminar_names FROM PUBLIC;
-- Grant access only to the future backend role after session validation exists.
-- The reserve call and submission must run in a transaction with question,
-- version and reception checks; return HTTP 409 for a conflicting manual name.
COMMIT;
