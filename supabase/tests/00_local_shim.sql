-- Minimal stand-in for the parts of Supabase the migrations depend on, so the
-- migration files can be executed and exercised against a real Postgres.
create extension if not exists "pgcrypto";
create extension if not exists "citext";

create schema if not exists auth;

create table auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text not null unique
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::json->>'sub')::uuid;
$$;

do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;

do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;

grant usage on schema public, auth to anon, authenticated;
grant select on auth.users to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
