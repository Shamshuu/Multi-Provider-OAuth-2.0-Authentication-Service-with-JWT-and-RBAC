-- Insert Admin User
-- Password: AdminPassword123!
INSERT INTO users (email, password_hash, name, role)
VALUES (
  'admin@example.com',
  '$2b$10$zsPu5GnI8MxPc0jQmV75BOC.wAzt1/b.vEtCSyhupZevqyAqkNoRy',
  'Admin User',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Insert Regular User
-- Password: UserPassword123!
INSERT INTO users (email, password_hash, name, role)
VALUES (
  'user@example.com',
  '$2b$10$P135K35nB5uUNN5PdeGCQuiHHajWQmMMroQ8DRnVh6g1x9xkRPmdB.',
  'Regular User',
  'user'
) ON CONFLICT (email) DO NOTHING;
