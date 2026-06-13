create extension if not exists pgcrypto;

alter table public.products
add column if not exists quantity integer not null default 100 check (quantity >= 0);

alter table public.orders
add column if not exists user_id uuid;

alter table public.orders
drop constraint if exists orders_user_id_fkey;

alter table public.orders
add constraint orders_user_id_fkey
foreign key (user_id) references auth.users(id) on delete cascade;

create index if not exists orders_user_id_created_at_idx
on public.orders (user_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  price numeric not null default 0,
  created_at timestamptz not null default now()
);

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

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

grant usage on schema public to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.decrease_product_quantity_on_order_item() to authenticated;
grant execute on function public.restore_product_quantity_on_order_item_delete() to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
