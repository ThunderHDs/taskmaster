-- Create development user and sample data
-- This migration creates a development user and sample tags for testing

-- Insert development user
INSERT INTO "User" (id, email, name, password, "createdAt", "updatedAt")
VALUES (
  'dev-user-id',
  'dev@example.com',
  'Development User',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: 'password'
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert sample tags
INSERT INTO "Tag" (id, label, color, "userId", "createdAt", "updatedAt")
VALUES 
  ('tag-1', 'Urgent', '#EF4444', 'dev-user-id', NOW(), NOW()),
  ('tag-2', 'Work', '#3B82F6', 'dev-user-id', NOW(), NOW()),
  ('tag-3', 'Personal', '#10B981', 'dev-user-id', NOW(), NOW()),
  ('tag-4', 'Important', '#F59E0B', 'dev-user-id', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample task
INSERT INTO "Task" (id, title, description, "userId", "nestingLevel", "createdAt", "updatedAt")
VALUES (
  'task-1',
  'Sample Task',
  'This is a sample task for development',
  'dev-user-id',
  0,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Link sample task with tags
INSERT INTO "TaskTag" ("taskId", "tagId")
VALUES 
  ('task-1', 'tag-1'),
  ('task-1', 'tag-2')
ON CONFLICT ("taskId", "tagId") DO NOTHING;