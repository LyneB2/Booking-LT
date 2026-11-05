-- Apply with the migration owner, never the runtime role. Supabase supplies auth.users.
CREATE SCHEMA booking;
REVOKE ALL ON SCHEMA booking FROM PUBLIC;
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'booking_app') THEN
    CREATE ROLE booking_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;
CREATE TABLE booking.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE booking.complexes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  slug text NOT NULL UNIQUE CHECK (length(slug) BETWEEN 2 AND 80 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  country_code text NOT NULL DEFAULT 'DO' CHECK (country_code ~ '^[A-Z]{2}$'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by uuid NOT NULL REFERENCES booking.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE booking.role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES booking.profiles(id),
  role text NOT NULL CHECK (role IN ('platform_admin', 'complex_admin', 'front_desk')),
  complex_id uuid REFERENCES booking.complexes(id),
  granted_by uuid NOT NULL REFERENCES booking.profiles(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_by uuid REFERENCES booking.profiles(id), revoked_at timestamptz,
  CHECK ((role = 'platform_admin') = (complex_id IS NULL)),
  CHECK ((revoked_at IS NULL) = (revoked_by IS NULL))
);
CREATE UNIQUE INDEX one_active_platform_role ON booking.role_assignments(user_id, role) WHERE complex_id IS NULL AND revoked_at IS NULL;
CREATE UNIQUE INDEX one_active_complex_role ON booking.role_assignments(user_id, role, complex_id) WHERE complex_id IS NOT NULL AND revoked_at IS NULL;
CREATE TABLE booking.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid NOT NULL REFERENCES booking.profiles(id), action text NOT NULL,
  complex_id uuid REFERENCES booking.complexes(id), subject_id uuid NOT NULL
);
CREATE FUNCTION booking.provision_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN INSERT INTO booking.profiles(id) VALUES (NEW.id) ON CONFLICT DO NOTHING; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION booking.provision_profile() FROM PUBLIC;
CREATE TRIGGER booking_profile_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION booking.provision_profile();
INSERT INTO booking.profiles(id) SELECT id FROM auth.users ON CONFLICT DO NOTHING;
-- Scope is deliberately absent from Supabase's exposed public schema. No anon/authenticated grants.
GRANT USAGE ON SCHEMA booking TO booking_app;
GRANT SELECT ON booking.profiles TO booking_app;
GRANT SELECT, INSERT ON booking.complexes TO booking_app;
GRANT SELECT, INSERT ON booking.role_assignments TO booking_app;
GRANT UPDATE (revoked_by, revoked_at) ON booking.role_assignments TO booking_app;
GRANT SELECT, INSERT ON booking.audit_events TO booking_app;
-- Bootstrap and disable operations use operator credentials only; web cannot enable or disable profiles.
-- Runtime cannot bypass the operator-only platform-admin bootstrap through an INSERT.
CREATE FUNCTION booking.protect_platform_grant() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user = 'booking_app' AND (NEW.role = 'platform_admin' OR (TG_OP = 'UPDATE' AND OLD.role = 'platform_admin')) THEN
    RAISE EXCEPTION 'Platform grants require operator credentials' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION booking.protect_platform_grant() FROM PUBLIC;
CREATE TRIGGER platform_grants_operator_only BEFORE INSERT OR UPDATE ON booking.role_assignments FOR EACH ROW EXECUTE FUNCTION booking.protect_platform_grant();
