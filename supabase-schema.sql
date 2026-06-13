create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  name text default '',
  surname text default '',
  phone text default '',
  role text not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'Вкус',
  price numeric not null default 0,
  quantity integer not null default 100 check (quantity >= 0),
  image text not null default '',
  builder_image text,
  sort_order numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
add column if not exists quantity integer not null default 100 check (quantity >= 0);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pickup text not null,
  notify text not null,
  phone text not null,
  total numeric not null default 0,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  price numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_created_at_idx
on public.orders (user_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
before update on public.orders
for each row execute function public.touch_updated_at();

create or replace function public.decrease_product_quantity_on_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set quantity = quantity - new.quantity
  where id = new.product_id
    and quantity >= new.quantity;

  if not found then
    raise exception 'Not enough product quantity for product %', new.product_id;
  end if;

  return new;
end;
$$;

drop trigger if exists order_items_decrease_product_quantity on public.order_items;
create trigger order_items_decrease_product_quantity
after insert on public.order_items
for each row execute function public.decrease_product_quantity_on_order_item();

create or replace function public.restore_product_quantity_on_order_item_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set quantity = quantity + old.quantity
  where id = old.product_id;

  return old;
end;
$$;

drop trigger if exists order_items_restore_product_quantity on public.order_items;
create trigger order_items_restore_product_quantity
after delete on public.order_items
for each row execute function public.restore_product_quantity_on_order_item_delete();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, surname, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'surname', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'customer'
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Profiles are readable by owner or admin" on public.profiles;
create policy "Profiles are readable by owner or admin"
on public.profiles for select
using (auth.uid() = id or public.is_admin());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile or admin can update all" on public.profiles;
create policy "Users can update own profile or admin can update all"
on public.profiles for update
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists "Anyone can read active products" on public.products;
create policy "Anyone can read active products"
on public.products for select
using (
  is_active = true
  or public.is_admin()
  or exists (
    select 1
    from public.order_items
    join public.orders on orders.id = order_items.order_id
    where order_items.product_id = products.id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
on public.products for insert
with check (public.is_admin());

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
on public.products for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
on public.products for delete
using (public.is_admin());

drop policy if exists "Users can read own cart" on public.cart_items;
create policy "Users can read own cart"
on public.cart_items for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own cart" on public.cart_items;
create policy "Users can insert own cart"
on public.cart_items for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own cart" on public.cart_items;
create policy "Users can update own cart"
on public.cart_items for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own cart" on public.cart_items;
create policy "Users can delete own cart"
on public.cart_items for delete
using (auth.uid() = user_id);

drop policy if exists "Users or admins can read order items" on public.order_items;
create policy "Users or admins can read order items"
on public.order_items for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own order items" on public.order_items;
create policy "Users can insert own order items"
on public.order_items for insert
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "Admins can update order items" on public.order_items;
create policy "Admins can update order items"
on public.order_items for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete order items" on public.order_items;
create policy "Admins can delete order items"
on public.order_items for delete
using (public.is_admin());

drop policy if exists "Users or admins can read orders" on public.orders;
create policy "Users or admins can read orders"
on public.orders for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can insert own orders" on public.orders;
create policy "Users can insert own orders"
on public.orders for insert
with check (auth.uid() = user_id);

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
on public.orders for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can update own orders" on public.orders;
create policy "Users can update own orders"
on public.orders for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Admins can delete orders" on public.orders;
create policy "Admins can delete orders"
on public.orders for delete
using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant execute on function public.decrease_product_quantity_on_order_item() to authenticated;
grant execute on function public.restore_product_quantity_on_order_item_delete() to authenticated;

insert into public.products (id, name, type, price, quantity, image, builder_image, sort_order, is_active)
values
  ('00000000-0000-0000-0000-000000000001', 'Ваниль', 'Вкус', 150, 100, 'images/vanil.png', 'images/vanil sharik.png', 10, true),
  ('00000000-0000-0000-0000-000000000002', 'Шоколад', 'Вкус', 150, 100, 'images/shokolad.png', 'images/shokolad sharik.png', 20, true),
  ('00000000-0000-0000-0000-000000000003', 'Клубника', 'Вкус', 150, 100, 'images/klubnika.png', 'images/klubnika sharik.png', 30, true),
  ('00000000-0000-0000-0000-000000000004', 'Мята', 'Вкус', 150, 100, 'images/myata.png', 'images/myata sharik.png', 40, true),
  ('00000000-0000-0000-0000-000000000005', 'Орео', 'Вкус', 150, 100, 'images/oreo.png', 'images/orero sharik.png', 50, true),
  ('00000000-0000-0000-0000-000000000006', 'Пекан', 'Вкус', 150, 100, 'images/pekan.png', 'images/pekan sharik.png', 60, true),
  ('00000000-0000-0000-0000-000000000007', 'Манго', 'Вкус', 150, 100, 'images/mango.png', 'images/mango sharik.png', 70, true),
  ('00000000-0000-0000-0000-000000000008', 'Облепиха', 'Вкус', 150, 100, 'images/oblepiha.png', 'images/oblepiha sharik.png', 80, true),
  ('00000000-0000-0000-0000-000000000009', 'Нутелла', 'Вкус', 150, 100, 'images/nutella.png', 'images/nutella sharik.png', 90, true),
  ('00000000-0000-0000-0000-000000000010', 'Шоколадный топпинг', 'Топпинг', 80, 100, 'images/toping shokolad.png', 'images/toping shokolad.png', 110, true),
  ('00000000-0000-0000-0000-000000000011', 'Карамель', 'Топпинг', 80, 100, 'images/toping karamel.png', 'images/toping karamel.png', 120, true),
  ('00000000-0000-0000-0000-000000000012', 'Варенье', 'Топпинг', 80, 100, 'images/toping varenie.png', 'images/toping varenie.png', 130, true),
  ('00000000-0000-0000-0000-000000000013', 'Орехи', 'Топпинг', 80, 100, 'images/toping orehi.png', 'images/toping orehi.png', 140, true),
  ('00000000-0000-0000-0000-000000000014', 'Печенье', 'Топпинг', 80, 100, 'images/toping pechenie.png', 'images/toping pechenie.png', 150, true),
  ('00000000-0000-0000-0000-000000000015', 'Шоколадная крошка', 'Топпинг', 80, 100, 'images/toping shokolad kroshka.png', 'images/toping shokolad kroshka.png', 160, true),
  ('00000000-0000-0000-0000-000000000016', 'M&M''s', 'Топпинг', 80, 100, 'images/toping m&ms.png', 'images/toping m&ms.png', 170, true),
  ('00000000-0000-0000-0000-000000000017', 'Кокосовая стружка', 'Топпинг', 80, 100, 'images/toping kokos struzh.png', 'images/toping kokos struzh.png', 180, true),
  ('00000000-0000-0000-0000-000000000018', 'Рожок', 'Держатель', 0, 100, 'images/format rozhok.png', 'images/format rozhok.png', 210, true),
  ('00000000-0000-0000-0000-000000000019', 'Пластмассовый держатель', 'Держатель', 0, 100, 'images/format plastik.png', 'images/format plastik.png', 220, true),
  ('00000000-0000-0000-0000-000000000020', 'Вафельный стаканчик', 'Держатель', 0, 100, 'images/format vaflya.png', 'images/format vaflya.png', 230, true)
on conflict (id) do update
set
  name = excluded.name,
  type = excluded.type,
  price = excluded.price,
  image = excluded.image,
  builder_image = excluded.builder_image,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

alter table public.products replica identity full;
alter table public.cart_items replica identity full;
alter table public.orders replica identity full;
alter table public.order_items replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.products;
exception
  when undefined_object then null;
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.cart_items;
exception
  when undefined_object then null;
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when undefined_object then null;
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.order_items;
exception
  when undefined_object then null;
  when duplicate_object then null;
end $$;
