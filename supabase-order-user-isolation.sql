-- Run this in Supabase SQL Editor to make customer orders private by user.
-- Existing orders with user_id = null cannot be assigned automatically: check them manually first.

alter table public.orders
add column if not exists user_id uuid;

alter table public.orders
drop constraint if exists orders_user_id_fkey;

alter table public.orders
add constraint orders_user_id_fkey
foreign key (user_id) references auth.users(id) on delete cascade;

create index if not exists orders_user_id_created_at_idx
on public.orders (user_id, created_at desc);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Users or admins can read orders" on public.orders;
create policy "Users or admins can read orders"
on public.orders for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can insert own orders" on public.orders;
create policy "Users can insert own orders"
on public.orders for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own orders" on public.orders;
create policy "Users can update own orders"
on public.orders for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
on public.orders for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete orders" on public.orders;
create policy "Admins can delete orders"
on public.orders for delete
using (public.is_admin());

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

-- Optional hardening after you assign or delete old shared orders:
-- select id, created_at, phone, total from public.orders where user_id is null;
-- alter table public.orders alter column user_id set not null;
