create sequence "public"."telegram_users_id_seq";

drop policy "Users can manage their own words" on "public"."words";

drop policy "Users can manage their own categories" on "public"."categories";

create table "public"."telegram_users" (
    "id" integer not null default nextval('telegram_users_id_seq'::regclass),
    "telegram_id" text not null,
    "username" text,
    "first_name" text,
    "last_name" text,
    "created_at" timestamp with time zone default now(),
    "last_active" timestamp with time zone default now()
);


alter table "public"."telegram_users" enable row level security;

create table "public"."user_settings" (
    "user_id" text not null,
    "current_category_id" uuid not null,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
);


alter table "public"."categories" drop column "user_uuid";

alter table "public"."categories" alter column "user_id" set data type text using "user_id"::text;

alter table "public"."user_roles" add column "user_id" text;

alter table "public"."user_roles" alter column "id" drop default;

alter table "public"."words" drop column "user_uuid";

alter table "public"."words" alter column "category_id" set default 'e5389e11-e618-4008-a933-06f719de4330'::uuid;

alter sequence "public"."telegram_users_id_seq" owned by "public"."telegram_users"."id";

CREATE INDEX idx_categories_user_id ON public.categories USING btree (user_id);

CREATE INDEX idx_telegram_users_telegram_id ON public.telegram_users USING btree (telegram_id);

CREATE UNIQUE INDEX telegram_users_pkey ON public.telegram_users USING btree (id);

CREATE UNIQUE INDEX telegram_users_telegram_id_key ON public.telegram_users USING btree (telegram_id);

CREATE UNIQUE INDEX user_settings_pkey ON public.user_settings USING btree (user_id);

alter table "public"."telegram_users" add constraint "telegram_users_pkey" PRIMARY KEY using index "telegram_users_pkey";

alter table "public"."user_settings" add constraint "user_settings_pkey" PRIMARY KEY using index "user_settings_pkey";

alter table "public"."telegram_users" add constraint "telegram_users_telegram_id_key" UNIQUE using index "telegram_users_telegram_id_key";

alter table "public"."user_settings" add constraint "user_settings_current_category_id_fkey" FOREIGN KEY (current_category_id) REFERENCES categories(id) not valid;

alter table "public"."user_settings" validate constraint "user_settings_current_category_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."telegram_users" to "anon";

grant insert on table "public"."telegram_users" to "anon";

grant references on table "public"."telegram_users" to "anon";

grant select on table "public"."telegram_users" to "anon";

grant trigger on table "public"."telegram_users" to "anon";

grant truncate on table "public"."telegram_users" to "anon";

grant update on table "public"."telegram_users" to "anon";

grant delete on table "public"."telegram_users" to "authenticated";

grant insert on table "public"."telegram_users" to "authenticated";

grant references on table "public"."telegram_users" to "authenticated";

grant select on table "public"."telegram_users" to "authenticated";

grant trigger on table "public"."telegram_users" to "authenticated";

grant truncate on table "public"."telegram_users" to "authenticated";

grant update on table "public"."telegram_users" to "authenticated";

grant delete on table "public"."telegram_users" to "service_role";

grant insert on table "public"."telegram_users" to "service_role";

grant references on table "public"."telegram_users" to "service_role";

grant select on table "public"."telegram_users" to "service_role";

grant trigger on table "public"."telegram_users" to "service_role";

grant truncate on table "public"."telegram_users" to "service_role";

grant update on table "public"."telegram_users" to "service_role";

grant delete on table "public"."user_settings" to "anon";

grant insert on table "public"."user_settings" to "anon";

grant references on table "public"."user_settings" to "anon";

grant select on table "public"."user_settings" to "anon";

grant trigger on table "public"."user_settings" to "anon";

grant truncate on table "public"."user_settings" to "anon";

grant update on table "public"."user_settings" to "anon";

grant delete on table "public"."user_settings" to "authenticated";

grant insert on table "public"."user_settings" to "authenticated";

grant references on table "public"."user_settings" to "authenticated";

grant select on table "public"."user_settings" to "authenticated";

grant trigger on table "public"."user_settings" to "authenticated";

grant truncate on table "public"."user_settings" to "authenticated";

grant update on table "public"."user_settings" to "authenticated";

grant delete on table "public"."user_settings" to "service_role";

grant insert on table "public"."user_settings" to "service_role";

grant references on table "public"."user_settings" to "service_role";

grant select on table "public"."user_settings" to "service_role";

grant trigger on table "public"."user_settings" to "service_role";

grant truncate on table "public"."user_settings" to "service_role";

grant update on table "public"."user_settings" to "service_role";

create policy "Allow telegram bot operations"
on "public"."categories"
as permissive
for all
to public
using (true)
with check (true);


create policy "Allow telegram bot operations"
on "public"."telegram_users"
as permissive
for all
to public
using (true)
with check (true);


create policy "Allow telegram user management"
on "public"."telegram_users"
as permissive
for insert
to public
with check (true);


create policy "Allow telegram users to read their data"
on "public"."telegram_users"
as permissive
for select
to public
using (true);


create policy "Enable insert for authenticated users"
on "public"."telegram_users"
as permissive
for insert
to public
with check (true);


create policy "Enable select for authenticated users"
on "public"."telegram_users"
as permissive
for select
to public
using (true);


create policy "Enable update for authenticated users"
on "public"."telegram_users"
as permissive
for update
to public
using (true);


create policy "Allow everyone to delete words"
on "public"."words"
as permissive
for delete
to authenticated, anon
using (true);


create policy "Allow everyone to insert words"
on "public"."words"
as permissive
for insert
to authenticated, anon
with check (true);


create policy "Allow users to delete their own words"
on "public"."words"
as permissive
for delete
to authenticated
using ((user_id = ( SELECT (auth.uid())::text AS uid)));


create policy "Allow users to read their own words"
on "public"."words"
as permissive
for select
to authenticated, anon
using (true);


create policy "Allow users to update their own words"
on "public"."words"
as permissive
for update
to authenticated, anon
using (true)
with check (true);


create policy "Users can manage their own categories"
on "public"."categories"
as permissive
for all
to public
using (((user_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND (users.is_admin = true))))))
with check (((user_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND (users.is_admin = true))))));


CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


