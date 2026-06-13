-- The built-in employee role is only a base account type.
-- Dashboard access must come from an assigned business role or direct permissions.
DELETE FROM role_permissions rp
USING roles r
WHERE rp.role_id = r.id
  AND r.key = 'employee'
  AND r.is_system = TRUE;
