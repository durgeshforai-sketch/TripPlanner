-- The server talks to the database with the secret (service-role) key only.
-- Grant that role access to the app schema; anon and authenticated get
-- nothing, and RLS with no policies stays as a second line of defence.

grant usage on schema tripsync to service_role;
grant all privileges on all tables in schema tripsync to service_role;
grant all privileges on all sequences in schema tripsync to service_role;
grant all privileges on all functions in schema tripsync to service_role;
alter default privileges in schema tripsync grant all on tables to service_role;
alter default privileges in schema tripsync grant all on sequences to service_role;
alter default privileges in schema tripsync grant all on functions to service_role;
