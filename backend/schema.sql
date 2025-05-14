create table if not exists games(
    id uuid primary key default gen_random_uuid(),
    status text not null default 'playing',
    orange_ai text not null,
    -- note pink_ai is nullable
    pink_ai text,
    created_at timestamp not null default now()
);

create table if not exists moves(
    id serial primary key,
    game_id uuid not null references games(id),
    player text not null,
    column_index integer not null,
    created_at timestamp not null default now()
);
