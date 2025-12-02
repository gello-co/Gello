-- Insert seed users into auth.users (for Supabase Auth)
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
) VALUES
-- Admin user
(
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'admin@gello.dev',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "admin"}',
    false,
    'authenticated'
),
-- Test member user
(
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'test@gello.dev',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"role": "member"}',
    false,
    'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Insert corresponding users into public.users (for app logic)
INSERT INTO public.users (
    id,
    email,
    password_hash,
    display_name,
    role,
    team_id,
    total_points,
    avatar_url,
    created_at
) VALUES
-- Admin user
(
    '22222222-2222-2222-2222-222222222222',
    'admin@gello.dev',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Admin User',
    'admin',
    null,
    0,
    '/images/black-pfp.png',
    NOW()
),
-- Test member user
(
    '11111111-1111-1111-1111-111111111111',
    'test@gello.dev',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Test Member',
    'member',
    null,
    0,
    '/images/green-pfp.png',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert seed teams
INSERT INTO public.teams (
    id,
    name,
    created_at
) VALUES
(
    '33333333-3333-3333-3333-333333333333',
    'Gello Team',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Update users with team_id after team is created
UPDATE public.users
SET team_id = '33333333-3333-3333-3333-333333333333'
WHERE
    id IN (
        '22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111'
    );

-- Insert seed boards
INSERT INTO public.boards (
    id,
    team_id,
    name,
    description,
    created_by,
    created_at
) VALUES
(
    '44444444-4444-4444-4444-444444444444',
    '33333333-3333-3333-3333-333333333333',
    'Welcome Board',
    'Your first board to get started',
    '22222222-2222-2222-2222-222222222222',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert seed lists
INSERT INTO public.lists (
    id,
    board_id,
    name,
    position,
    created_at
) VALUES
(
    '55555555-5555-5555-5555-555555555555',
    '44444444-4444-4444-4444-444444444444',
    'To Do',
    0,
    NOW()
),
(
    '66666666-6666-6666-6666-666666666666',
    '44444444-4444-4444-4444-444444444444',
    'In Progress',
    1,
    NOW()
),
(
    '77777777-7777-7777-7777-777777777777',
    '44444444-4444-4444-4444-444444444444',
    'Done',
    2,
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert seed tasks
INSERT INTO public.tasks (
    id,
    list_id,
    title,
    description,
    assigned_to,
    story_points,
    position,
    created_at
) VALUES
(
    '88888888-8888-8888-8888-888888888888',
    '55555555-5555-5555-5555-555555555555',
    'Welcome to Gello!',
    'This is your first task. Complete it to earn 10 points!',
    '11111111-1111-1111-1111-111111111111',
    1,
    0,
    NOW()
),
(
    '99999999-9999-9999-9999-999999999999',
    '55555555-5555-5555-5555-555555555555',
    'Set up your profile',
    'Add your avatar and display name in the settings.',
    '11111111-1111-1111-1111-111111111111',
    1,
    1,
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert initial points history entries
INSERT INTO public.points_history (
    id,
    user_id,
    task_id,
    points_earned,
    reason,
    created_at
) VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    '88888888-8888-8888-8888-888888888888',
    10,
    'task_complete',
    NOW()
)
ON CONFLICT (id) DO NOTHING;
