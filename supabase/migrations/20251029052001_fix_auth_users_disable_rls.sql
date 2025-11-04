-- Disable RLS on auth.users if enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND c.relrowsecurity = TRUE
  ) THEN
    EXECUTE 'ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY';
  END IF;
END
$$;

-- Drop any accidental policies on auth.users (no-op if none)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth' AND c.relname = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON auth.users;', pol.polname);
  END LOOP;
END
$$;

-- Log current state
DO $$
DECLARE rls_enabled boolean;
BEGIN
  SELECT c.relrowsecurity INTO rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'auth' AND c.relname = 'users';
  RAISE NOTICE 'auth.users RLS enabled? %', rls_enabled;
END
$$;
