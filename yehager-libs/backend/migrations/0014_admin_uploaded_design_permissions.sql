INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN ('uploaded_designs.view', 'uploaded_designs.review')
WHERE r.key = 'admin'
ON CONFLICT DO NOTHING;
