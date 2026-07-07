-- Seed data для SAMRUQ ERP

insert into roles (name, description) values
('director',        'Полный доступ для директора'),
('manager',         'Доступ к своим лидам и сделкам'),
('project_manager', 'Управление всеми проектами и задачами'),
('accountant',      'Работа с договорными и финансовыми документами'),
('procurement',     'Управление закупками и поставщиками');

-- Тестовые пользователи для связки с Supabase Auth.
-- Замените auth_id на реальные UUID из таблицы auth.users после создания учётных записей.
insert into users (auth_id, email, full_name, role_id, is_active)
values
('00000000-0000-0000-0000-000000000001', 'director@samruq.kz',    'Директор Samruq',                1, true),
('00000000-0000-0000-0000-000000000002', 'manager1@samruq.kz',    'Менеджер Нурлан',                2, true),
('00000000-0000-0000-0000-000000000003', 'manager2@samruq.kz',    'Менеджер Аружан',                2, true),
('00000000-0000-0000-0000-000000000004', 'projectmgr@samruq.kz',  'Руководитель проекта Жанат',     3, true),
('00000000-0000-0000-0000-000000000005', 'accountant@samruq.kz',  'Бухгалтер Алина',                4, true),
('00000000-0000-0000-0000-000000000006', 'procurement@samruq.kz', 'Снабжение Саят',                 5, true);

insert into lead_sources (name, description) values
('Instagram',    'Лид из Instagram'),
('Facebook',     'Лид из Facebook'),
('TikTok',       'Лид из TikTok'),
('Google Ads',   'Лид из Google Ads'),
('Сайт',         'Лид с сайта'),
('WhatsApp',     'Лид из WhatsApp'),
('Телефон',      'Лид из телефонного звонка'),
('Рекомендации', 'Лид от клиента или партнёра');

insert into deal_stages (name, progress_percent, order_index) values
('Новый',        5,   1),
('КП отправлено',35,  2),
('Договор',      45,  3),
('Оплата',       60,  4),
('Производство', 75,  5),
('Монтаж',       90,  6),
('Завершено',    100, 7);

insert into document_categories (name) values
('Договор'),
('Чертеж'),
('Акт'),
('Фото'),
('КП'),
('Смета');