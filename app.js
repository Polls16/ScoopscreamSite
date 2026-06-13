const SUPABASE_URL = "https://ygzblyvrbfhmnfljnvzg.supabase.co";

const SUPABASE_KEY =
"sb_publishable_-DIyOJVD95lEBHuD88L8bw_NGenLhGO";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

async function testConnection() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*");

  console.log("Products:", data);
  console.log("Error:", error);
}

testConnection();

const defaultProducts = [
  { id: "vanil", name: "Ваниль", type: "Вкус", price: 150, image: "images/vanil.png", builderImage: "images/vanil sharik.png", sortOrder: 10 },
  { id: "shokolad", name: "Шоколад", type: "Вкус", price: 150, image: "images/shokolad.png", builderImage: "images/shokolad sharik.png", sortOrder: 20 },
  { id: "klubnika", name: "Клубника", type: "Вкус", price: 150, image: "images/klubnika.png", builderImage: "images/klubnika sharik.png", sortOrder: 30 },
  { id: "myata", name: "Мята", type: "Вкус", price: 150, image: "images/myata.png", builderImage: "images/myata sharik.png", sortOrder: 40 },
  { id: "oreo", name: "Орео", type: "Вкус", price: 150, image: "images/oreo.png", builderImage: "images/orero sharik.png", sortOrder: 50 },
  { id: "pekan", name: "Пекан", type: "Вкус", price: 150, image: "images/pekan.png", builderImage: "images/pekan sharik.png", sortOrder: 60 },
  { id: "mango", name: "Манго", type: "Вкус", price: 150, image: "images/mango.png", builderImage: "images/mango sharik.png", sortOrder: 70 },
  { id: "oblepiha", name: "Облепиха", type: "Вкус", price: 150, image: "images/oblepiha.png", builderImage: "images/oblepiha sharik.png", sortOrder: 80 },
  { id: "nutella", name: "Нутелла", type: "Вкус", price: 150, image: "images/nutella.png", builderImage: "images/nutella sharik.png", sortOrder: 90 },
  { id: "toping-shokolad", name: "Шоколадный топпинг", type: "Топпинг", price: 80, image: "images/toping shokolad.png", builderImage: "images/toping shokolad.png", sortOrder: 110 },
  { id: "toping-karamel", name: "Карамель", type: "Топпинг", price: 80, image: "images/toping karamel.png", builderImage: "images/toping karamel.png", sortOrder: 120 },
  { id: "toping-varenie", name: "Варенье", type: "Топпинг", price: 80, image: "images/toping varenie.png", builderImage: "images/toping varenie.png", sortOrder: 130 },
  { id: "toping-orehi", name: "Орехи", type: "Топпинг", price: 80, image: "images/toping orehi.png", builderImage: "images/toping orehi.png", sortOrder: 140 },
  { id: "toping-pechenie", name: "Печенье", type: "Топпинг", price: 80, image: "images/toping pechenie.png", builderImage: "images/toping pechenie.png", sortOrder: 150 },
  { id: "toping-kroshka", name: "Шоколадная крошка", type: "Топпинг", price: 80, image: "images/toping shokolad kroshka.png", builderImage: "images/toping shokolad kroshka.png", sortOrder: 160 },
  { id: "toping-mms", name: "M&M's", type: "Топпинг", price: 80, image: "images/toping m&ms.png", builderImage: "images/toping m&ms.png", sortOrder: 170 },
  { id: "toping-kokos", name: "Кокосовая стружка", type: "Топпинг", price: 80, image: "images/toping kokos struzh.png", builderImage: "images/toping kokos struzh.png", sortOrder: 180 },
  { id: "holder-rozhok", name: "Рожок", type: "Держатель", price: 0, image: "images/format rozhok.png", builderImage: "images/format rozhok.png", sortOrder: 210 },
  { id: "holder-plastik", name: "Пластмассовый держатель", type: "Держатель", price: 0, image: "images/format plastik.png", builderImage: "images/format plastik.png", sortOrder: 220 },
  { id: "holder-vaflya", name: "Вафельный стаканчик", type: "Держатель", price: 0, image: "images/format vaflya.png", builderImage: "images/format vaflya.png", sortOrder: 230 },
];

const defaultById = new Map(defaultProducts.map((product) => [product.id, product]));
const defaultByName = new Map(defaultProducts.map((product) => [product.name.toLowerCase(), product]));
let productCache = null;
const activeSubscriptions = new Set();

const money = (value) => `${Number(value || 0)} рублей`;

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const normalizeType = (type) => {
  const value = String(type || "").toLowerCase();
  if (value.includes("топ")) return "Топпинг";
  if (value.includes("держ") || value.includes("формат")) return "Держатель";
  if (value.includes("нов")) return "Новинка";
  return "Вкус";
};

const isFlavor = (product) => product.type === "Вкус" || product.type === "Новинка";

const normalizeProduct = (row, index = 0) => {
  const id = String(row.id || row.slug || `product-${index + 1}`);
  const name = String(row.name || "Позиция меню");
  const fallback = defaultById.get(id) || defaultByName.get(name.toLowerCase()) || {};
  const price = Number(row.price ?? fallback.price ?? 0);
  const quantity = Number(row.quantity ?? fallback.quantity ?? 100);
  return {
    id,
    name,
    type: normalizeType(row.type || row.category || fallback.type),
    price: Number.isFinite(price) ? price : 0,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    image: String(row.image || row.image_url || row.photo || fallback.image || ""),
    builderImage: String(row.builder_image || row.builderImage || fallback.builderImage || row.image || fallback.image || ""),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? fallback.sortOrder ?? index),
    isActive: row.is_active !== false && row.active !== false,
  };
};

async function loadProducts(options = {}) {
  if (productCache && !options.force && !options.includeInactive) return productCache;

  const { data, error } = await supabaseClient
    .from("products")
    .select("*");

  if (error) {
    console.error("Products load error:", error);
    if (options.includeInactive) return defaultProducts;
    productCache = defaultProducts;
    return productCache;
  }

  const products = (data || [])
    .map(normalizeProduct)
    .sort((first, second) => first.sortOrder - second.sortOrder);

  if (options.includeInactive) return products;

  productCache = products.filter((product) => product.isActive);

  return productCache;
}

function productById(products, id) {
  return products.find((product) => product.id === id);
}

function isProductAvailable(product) {
  return product?.isActive && Number(product.quantity || 0) > 0;
}

function productFromCard(card) {
  return {
    id: card.dataset.id,
    name: card.dataset.name,
    price: Number(card.dataset.price || 0),
  };
}

function productName(value) {
  if (!value) return "";
  return typeof value === "string" ? value : value.name;
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("ru-RU");
}

function cartItemFromRow(row) {
  const product = normalizeProduct(row.product || row.products || {}, 0);
  const quantity = Number(row.quantity || 1);
  return {
    id: row.id,
    rowId: row.id,
    productId: row.product_id,
    quantity,
    product,
    price: Number(product.price || 0) * quantity,
    createdAt: row.created_at,
  };
}

function cartLineTotal(item) {
  return Number(item.product?.price || 0) * Number(item.quantity || 0);
}

function orderItemSummary(item) {
  const product = item.product || item;
  const quantity = Number(item.quantity || 1);
  const price = Number(item.price ?? product.price ?? 0);
  return `${escapeHtml(product.name || "Товар")} · ${escapeHtml(product.type || "Позиция")} · ${quantity} шт. · ${money(price * quantity)}`;
}

function orderNumber(id) {
  return String(id || "").slice(0, 8).toUpperCase();
}

function queryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error("Auth user error:", error);
    return null;
  }
  return data.user;
}

async function getProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Profile load error:", error);
    return null;
  }

  return data;
}

async function ensureProfile(user, values = {}) {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const payload = {
    id: user.id,
    email: user.email,
    name: values.name ?? metadata.name ?? "",
    surname: values.surname ?? metadata.surname ?? "",
    phone: values.phone ?? metadata.phone ?? "",
  };

  const { data, error } = await supabaseClient
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("Profile save error:", error);
    return getProfile(user.id);
  }

  return data;
}

async function isAdminUser() {
  const user = await getCurrentUser();
  if (!user) return false;

  const profile = await ensureProfile(user);
  return profile?.role === "admin";
}

async function requireAdmin() {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    window.location.href = "admin-login.html";
    return false;
  }
  return true;
}

function subscribeToTable(table, callback, key = table) {
  if (activeSubscriptions.has(key)) return null;
  activeSubscriptions.add(key);
  return supabaseClient
    .channel(`${key}-${Date.now()}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, callback)
    .subscribe();
}

async function renderManagedMenu() {
  const grid = document.querySelector(".menu-grid");
  if (!grid) return;

  const products = await loadProducts();
  const flavors = products.filter(isFlavor);

  grid.innerHTML = flavors.length
    ? flavors
      .map((item) => `
        <article>
          <img src="${escapeHtml(item.image)}" alt="" />
          <h2>${escapeHtml(item.name)}</h2>
        </article>
      `)
      .join("")
    : '<p class="empty-note">В меню пока нет товаров.</p>';

  subscribeToTable("products", async () => {
    productCache = null;
    await renderManagedMenu();
  }, "menu-products");
}

function choiceCard(product, className, withQuantity = false) {
  const isAvailable = isProductAvailable(product);
  return `
    <article class="choice-card ${className} ${isAvailable ? "" : "is-out-of-stock"}" data-id="${escapeHtml(product.id)}" data-name="${escapeHtml(product.name)}" data-price="${escapeHtml(product.price)}" data-quantity="${escapeHtml(product.quantity)}">
      <img src="${escapeHtml(product.builderImage || product.image)}" alt="" />
      <h3>${escapeHtml(product.name)}</h3>
      <p class="choice-stock">${isAvailable ? `В наличии: ${escapeHtml(product.quantity)}` : "Нет в наличии"}</p>
      ${withQuantity ? `<div class="qty-control"><button type="button" data-action="minus">−</button><span>0</span><button type="button" data-action="plus" ${isAvailable ? "" : "disabled"}>+</button></div>` : ""}
    </article>
  `;
}

async function fillOrderChoices() {
  const scoopGrid = document.querySelector('[data-builder="scoops"]');
  const holderGrid = document.querySelector('[data-builder="holder"]');
  const toppingGrid = document.querySelector('[data-builder="toppings"]');
  if (!scoopGrid || !holderGrid || !toppingGrid) return [];

  const products = await loadProducts();
  const flavors = products.filter(isFlavor);
  const holders = products.filter((product) => product.type === "Держатель");
  const toppings = products.filter((product) => product.type === "Топпинг");

  scoopGrid.innerHTML = flavors.length
    ? flavors.map((product) => choiceCard(product, "", true)).join("")
    : '<p class="empty-note">Вкусы пока не добавлены в базу данных.</p>';

  holderGrid.innerHTML = holders.length
    ? holders.map((product) => choiceCard(product, "holder-card")).join("")
    : '<p class="empty-note">Форматы пока не добавлены в базу данных.</p>';

  toppingGrid.innerHTML = toppings.length
    ? toppings.map((product) => choiceCard(product, "topping-card")).join("")
    : '<p class="empty-note">Топпинги пока не добавлены в базу данных.</p>';

  return products;
}

async function addCartItems(lines) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: { message: "Перед добавлением в корзину нужно войти или зарегистрироваться." } };
  }

  if (!lines.length) {
    return { error: { message: "Выберите товары для корзины." } };
  }

  for (const line of lines) {
    const { data: product, error: productError } = await supabaseClient
      .from("products")
      .select("name, quantity, is_active")
      .eq("id", line.productId)
      .maybeSingle();

    if (productError) return { error: productError };

    const { data: existing, error: loadError } = await supabaseClient
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("product_id", line.productId)
      .limit(1)
      .maybeSingle();

    if (loadError) return { error: loadError };

    const nextQuantity = Number(existing?.quantity || 0) + Number(line.quantity || 1);
    if (!product?.is_active || Number(product?.quantity || 0) < nextQuantity) {
      return { error: { message: `Товар «${product?.name || "позиция"}» закончился или его недостаточно в наличии.` } };
    }

    const request = existing
      ? supabaseClient
        .from("cart_items")
        .update({ quantity: nextQuantity })
        .eq("id", existing.id)
      : supabaseClient
        .from("cart_items")
        .insert({
          user_id: user.id,
          product_id: line.productId,
          quantity: line.quantity,
        });

    const { error } = await request;
    if (error) return { error };
  }

  return { error: null };
}

async function initOrderBuilder() {
  const addButton = document.querySelector("#add-position");
  if (!addButton) return;

  const products = await fillOrderChoices();
  const totalNode = document.querySelector("#scoop-total");
  const statusNode = document.querySelector("#builder-status");
  const scoopCards = [...document.querySelectorAll('[data-builder="scoops"] .choice-card')];
  const holderCards = [...document.querySelectorAll(".holder-card")];
  const toppingCards = [...document.querySelectorAll(".topping-card")];
  const state = {
    scoops: Object.fromEntries(scoopCards.map((card) => [card.dataset.id, 0])),
    holder: "",
    toppings: new Set(),
  };

  const totalScoops = () => Object.values(state.scoops).reduce((sum, count) => sum + count, 0);
  const selectedHolder = () => productById(products, state.holder) || null;
  const selectedToppings = () => [...state.toppings].map((id) => productById(products, id)).filter(Boolean);
  const productStock = (id) => Number(productById(products, id)?.quantity || 0);
  const selectedScoops = () =>
    Object.entries(state.scoops)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => {
        const product = productById(products, id) || {};
        return { product, count };
      });
  const selectedCartLines = () => [
    ...selectedScoops().map(({ product, count }) => ({ productId: product.id, quantity: count })),
    ...(selectedHolder() ? [{ productId: selectedHolder().id, quantity: 1 }] : []),
    ...selectedToppings().map((product) => ({ productId: product.id, quantity: 1 })),
  ].filter((line) => line.productId);

  const render = () => {
    const total = totalScoops();
    totalNode.textContent = total;
    scoopCards.forEach((card) => {
      const count = state.scoops[card.dataset.id];
      card.querySelector(".qty-control span").textContent = count;
      card.classList.toggle("is-selected", count > 0);
      card.querySelector('[data-action="plus"]').disabled = total >= 5 || count >= productStock(card.dataset.id);
      card.querySelector('[data-action="minus"]').disabled = count <= 0;
    });
    holderCards.forEach((card) => card.classList.toggle("is-selected", state.holder === card.dataset.id));
    toppingCards.forEach((card) => card.classList.toggle("is-selected", state.toppings.has(card.dataset.id)));
  };

  scoopCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      const id = card.dataset.id;
      if (productStock(id) <= state.scoops[id]) {
        statusNode.textContent = "Этот товар закончился.";
        return;
      }
      if (totalScoops() < 5) {
        state.scoops[id] += 1;
        statusNode.textContent = "";
        render();
      }
    });

    card.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        const id = card.dataset.id;
        if (button.dataset.action === "plus" && totalScoops() < 5 && state.scoops[id] < productStock(id)) state.scoops[id] += 1;
        if (button.dataset.action === "minus" && state.scoops[id] > 0) state.scoops[id] -= 1;
        statusNode.textContent = "";
        render();
      });
    });
  });

  holderCards.forEach((card) => {
    card.addEventListener("click", () => {
      if (productStock(card.dataset.id) <= 0) {
        statusNode.textContent = "Этот формат сейчас закончился.";
        return;
      }
      state.holder = card.dataset.id;
      statusNode.textContent = "";
      render();
    });
  });

  toppingCards.forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      if (productStock(id) <= 0) {
        statusNode.textContent = "Этот топпинг сейчас закончился.";
        return;
      }
      state.toppings.has(id) ? state.toppings.delete(id) : state.toppings.add(id);
      render();
    });
  });

  addButton.addEventListener("click", async () => {
    const total = totalScoops();
    if (!total) {
      statusNode.textContent = "Выберите хотя бы один шарик.";
      return;
    }
    if (!state.holder) {
      statusNode.textContent = "Выберите держатель для позиции.";
      return;
    }

    const unavailableLine = selectedCartLines().find((line) => line.quantity > productStock(line.productId));
    if (unavailableLine) {
      statusNode.textContent = "В корзину нельзя добавить больше товара, чем есть в наличии.";
      return;
    }

    addButton.disabled = true;
    statusNode.textContent = "Сохраняем товары...";

    const { error } = await addCartItems(selectedCartLines());

    addButton.disabled = false;
    if (error) {
      statusNode.innerHTML = `${escapeHtml(error.message)} <a href="account.html">Войти</a>`;
      return;
    }

    Object.keys(state.scoops).forEach((id) => (state.scoops[id] = 0));
    state.holder = "";
    state.toppings.clear();
    statusNode.innerHTML = 'Товары добавлены в корзину. <a href="cart.html">Перейти в корзину</a> или собрать следующую позицию.';
    render();
  });

  subscribeToTable("products", () => {
    window.location.reload();
  }, "order-products");

  render();
}

function availablePickupTimes() {
  const now = new Date();
  const isSummer = now.getMonth() >= 4 && now.getMonth() <= 8;
  const latestHour = isSummer ? 21 : 20;
  const earliestHour = Math.max(10, now.getMinutes() === 0 ? now.getHours() + 1 : now.getHours() + 2);
  const times = [];
  for (let hour = earliestHour; hour <= latestHour; hour += 1) {
    times.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return times;
}

async function loadCart() {
  const user = await getCurrentUser();
  if (!user) return { user: null, items: [], error: null };

  const { data, error } = await supabaseClient
    .from("cart_items")
    .select("id, user_id, product_id, quantity, created_at, product:products(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Cart load error:", error);
    return { user, items: [], error };
  }

  return { user, items: (data || []).map(cartItemFromRow), error: null };
}

async function renderCart() {
  const list = document.querySelector("#cart-list");
  if (!list) return;

  const totalNode = document.querySelector("#cart-total");
  const { user, items: cart, error } = await loadCart();

  if (!user) {
    list.innerHTML = '<p class="empty-note">Чтобы пользоваться корзиной, войдите или зарегистрируйтесь в личном кабинете.</p>';
    totalNode.textContent = money(0);
    return;
  }

  if (error) {
    list.innerHTML = '<p class="empty-note">Не удалось загрузить корзину.</p>';
    totalNode.textContent = money(0);
    return;
  }

  if (!cart.length) {
    list.innerHTML = '<p class="empty-note">Корзина пустая. Добавьте позицию на странице заказа.</p>';
    totalNode.textContent = money(0);
  } else {
    list.innerHTML = cart
      .map((item, index) => {
        const product = item.product || {};
        return `
          <article class="cart-item">
            ${product.image ? `<img src="${escapeHtml(product.image)}" alt="" />` : ""}
            <h3>${escapeHtml(product.name || `Позиция ${index + 1}`)}</h3>
            <p><strong>Раздел:</strong> ${escapeHtml(product.type || "Товар")}</p>
            <p><strong>Количество:</strong> ${escapeHtml(item.quantity)}</p>
            <p><strong>Цена за штуку:</strong> ${money(product.price)}</p>
            <p><strong>Сумма:</strong> ${money(cartLineTotal(item))}</p>
            <button type="button" data-remove="${escapeHtml(item.rowId)}">Удалить товар</button>
            <a href="order.html">Редактировать</a>
          </article>
        `;
      })
      .join("");
    totalNode.textContent = money(cart.reduce((sum, item) => sum + cartLineTotal(item), 0));
  }

  list.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      const { error: removeError } = await supabaseClient
        .from("cart_items")
        .delete()
        .eq("id", button.dataset.remove)
        .eq("user_id", user.id);
      if (removeError) console.error("Cart remove error:", removeError);
      await renderCart();
    });
  });

  subscribeToTable("cart_items", renderCart, "cart-items");
}

function initCheckout() {
  const form = document.querySelector("#checkout-form");
  if (!form) return;

  const timeSelect = document.querySelector("#pickup-time");
  const status = document.querySelector("#checkout-status");
  const fillTimes = () => {
    const times = availablePickupTimes();
    timeSelect.innerHTML = times.length
      ? times.map((time) => `<option value="${time}">${time}</option>`).join("")
      : '<option value="">Сегодня заказ уже недоступен</option>';
  };
  fillTimes();

  document.querySelectorAll('input[name="pickupMode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      timeSelect.disabled = form.elements.pickupMode.value !== "time";
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";

    const { user, items: cart, error } = await loadCart();
    if (!user) {
      status.innerHTML = 'Перед оплатой нужно <a href="account.html">войти или зарегистрироваться</a>.';
      return;
    }
    if (error) {
      status.textContent = "Не удалось загрузить корзину из базы данных.";
      return;
    }
    if (!cart.length) {
      status.textContent = "Корзина пустая.";
      return;
    }
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      status.textContent = "Введите номер телефона.";
      return;
    }

    const times = availablePickupTimes();
    if (!times.length) {
      status.textContent = "Сегодня заказы к выдаче уже недоступны.";
      return;
    }

    const pickup = form.elements.pickupMode.value === "soon" ? `Как можно скорее (${times[0]})` : timeSelect.value;
    if (!pickup) {
      status.textContent = "Выберите время выдачи.";
      return;
    }

    const unavailableItem = cart.find((item) => !item.product?.isActive || Number(item.quantity || 0) > Number(item.product?.quantity || 0));
    if (unavailableItem) {
      status.textContent = `Товара «${unavailableItem.product?.name || "позиция"}» недостаточно в наличии. Измените корзину или выберите другой товар.`;
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    status.textContent = "Сохраняем заказ...";

    const total = cart.reduce((sum, item) => sum + cartLineTotal(item), 0);
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        user_id: user.id,
        pickup,
        notify: form.elements.notify.value,
        phone: form.elements.phone.value,
        total,
        status: "pending_payment",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order save error:", orderError);
      status.textContent = "Не удалось сохранить заказ.";
      submitButton.disabled = false;
      return;
    }

    const { error: itemsError } = await supabaseClient
      .from("order_items")
      .insert(cart.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: Number(item.product?.price || 0),
      })));

    if (itemsError) {
      console.error("Order items save error:", itemsError);
      status.textContent = "Заказ создан, но товары заказа не удалось сохранить в order_items.";
      submitButton.disabled = false;
      return;
    }

    const { error: clearError } = await supabaseClient
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);

    if (clearError) console.error("Cart clear error:", clearError);

    status.textContent = "Заказ создан. Переходим к оплате...";
    submitButton.disabled = false;
    await renderCart();
    window.location.href = `payment.html?order=${encodeURIComponent(order.id)}`;
  });
}

async function loadUserOrders(userId) {
  const currentUserId = userId || (await getCurrentUser())?.id;
  if (!currentUserId) return [];

  const { data, error } = await supabaseClient
    .from("orders")
    .select("*, order_items(id, product_id, quantity, price, product:products(*))")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Orders load error:", error);
    return [];
  }

  return data || [];
}

function renderOrdersList(orders) {
  return orders.length
    ? orders.map((order, index) => `
      <article class="account-order">
        <h3>Заказ ${index + 1}</h3>
        <p>№ ${escapeHtml(orderNumber(order.id))}</p>
        <p>Статус: ${escapeHtml(order.status || "new")}</p>
        <p>${escapeHtml(formatDate(order.created_at))}</p>
        <p>Забрать: ${escapeHtml(order.pickup)}</p>
        <p>Сумма: ${money(order.total)}</p>
      </article>
    `).join("")
    : '<p class="empty-note">Нет заказов</p>';
}

async function loadOrder(orderId) {
  if (!orderId) return { order: null, error: { message: "Заказ не найден." } };

  const user = await getCurrentUser();
  if (!user) return { order: null, error: { message: "Войдите, чтобы открыть заказ." } };

  const { data, error } = await supabaseClient
    .from("orders")
    .select("*, order_items(id, product_id, quantity, price, product:products(*))")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) console.error("Order load error:", error);
  return { order: data, error };
}

function initPaymentPage() {
  const card = document.querySelector("#payment-card");
  if (!card) return;

  const title = document.querySelector("#payment-title");
  const sumNode = document.querySelector("#payment-sum");
  const button = document.querySelector("#payment-button");
  const status = document.querySelector("#payment-status");
  const orderId = queryParam("order");

  loadOrder(orderId).then(({ order, error }) => {
    if (error || !order) {
      title.textContent = "Заказ не найден";
      sumNode.textContent = "Вернитесь в корзину и попробуйте оформить заказ ещё раз.";
      button.disabled = true;
      return;
    }

    title.textContent = `Оплата заказа № ${orderNumber(order.id)}`;
    sumNode.textContent = `Сумма: ${money(order.total)}`;
  });

  button?.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "Проводим платёж...";

    const user = await getCurrentUser();
    if (!user) {
      status.textContent = "Войдите, чтобы оплатить заказ.";
      button.disabled = false;
      return;
    }

    const { data, error } = await supabaseClient
      .from("orders")
      .update({ status: "paid" })
      .eq("id", orderId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.error("Payment error:", error);
      status.textContent = "Не удалось выполнить платёж.";
      button.disabled = false;
      return;
    }

    status.textContent = "Платёж успешно выполнен";
    window.setTimeout(() => {
      window.location.href = `order-success.html?order=${encodeURIComponent(orderId)}`;
    }, 900);
  });
}

function initOrderSuccessPage() {
  const card = document.querySelector("#order-success-card");
  if (!card) return;

  const orderNode = document.querySelector("#success-order");
  const pickupNode = document.querySelector("#success-pickup");
  const orderId = queryParam("order");

  loadOrder(orderId).then(({ order, error }) => {
    if (error || !order) {
      orderNode.textContent = "Заказ не найден.";
      pickupNode.textContent = "";
      return;
    }

    orderNode.textContent = `Заказ № ${orderNumber(order.id)} успешно оформлен.`;
    pickupNode.textContent = `Время получения: ${order.pickup}`;
  });
}

function initAccount() {
  const loginForm = document.querySelector("#login-form");
  if (!loginForm) return;

  const registerForm = document.querySelector("#register-form");
  const cabinet = document.querySelector("#account-cabinet");
  const loginStatus = document.querySelector("#login-status");
  const registerStatus = document.querySelector("#register-status");
  const resetPanel = document.querySelector("#password-reset");
  const resetEmail = document.querySelector("#reset-email");
  const resetButton = document.querySelector("#reset-password-button");
  const resetPrompt = "Введите e-mail, чтобы отправить письмо для сброса пароля.";
  const resetSuccess = "Если пользователь с таким e-mail существует, инструкция по восстановлению будет отправлена на почту.";

  const show = (mode) => {
    loginForm.classList.toggle("is-hidden", mode !== "login");
    registerForm.classList.toggle("is-hidden", mode !== "register");
    cabinet.classList.toggle("is-hidden", mode !== "cabinet");
  };

  const hideResetPanel = () => {
    resetPanel?.classList.add("is-hidden");
    resetPanel?.setAttribute("aria-hidden", "true");
    if (resetEmail) {
      resetEmail.disabled = true;
      resetEmail.classList.remove("is-error");
    }
  };

  const showResetPanel = () => {
    if (!resetPanel || !resetEmail) return;

    const currentEmail = loginForm.elements.login.value.trim();
    loginStatus.textContent = resetPrompt;
    resetEmail.disabled = false;
    resetEmail.value = resetEmail.value || currentEmail;
    resetEmail.classList.remove("is-error");
    resetPanel.classList.remove("is-hidden");
    resetPanel.setAttribute("aria-hidden", "false");
    resetEmail.focus();
  };

  const submitPasswordReset = async () => {
    if (!resetEmail || !resetButton) return;

    const email = resetEmail.value.trim();
    resetEmail.value = email;

    if (!email || !resetEmail.validity.valid) {
      resetEmail.classList.add("is-error");
      loginStatus.textContent = "Введите корректный e-mail для сброса пароля.";
      return;
    }

    resetEmail.classList.remove("is-error");
    resetButton.disabled = true;
    loginStatus.textContent = "Отправляем инструкцию...";

    await new Promise((resolve) => setTimeout(resolve, 300));

    loginForm.elements.login.value = email;
    resetButton.disabled = false;
    loginStatus.textContent = resetSuccess;
  };

  const renderCabinet = async () => {
    const user = await getCurrentUser();
    if (!user) {
      show("login");
      return;
    }

    const profile = await ensureProfile(user);
    document.querySelector("#account-details").innerHTML = `
      <p><strong>Имя:</strong> ${escapeHtml(profile?.name || "")} ${escapeHtml(profile?.surname || "")}</p>
      <p><strong>E-mail:</strong> ${escapeHtml(user.email)}</p>
      <p><strong>Телефон:</strong> ${escapeHtml(profile?.phone || "")}</p>
    `;

    const orders = await loadUserOrders(user.id);
    document.querySelector("#account-orders").innerHTML = renderOrdersList(orders);
    hideResetPanel();
    show("cabinet");
  };

  document.querySelector("#show-register").addEventListener("click", () => {
    hideResetPanel();
    loginStatus.textContent = "";
    show("register");
  });
  document.querySelector("#show-login").addEventListener("click", () => {
    hideResetPanel();
    registerStatus.textContent = "";
    show("login");
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    registerStatus.textContent = "";
    if (!registerForm.checkValidity()) {
      registerForm.classList.add("was-validated");
      registerStatus.textContent = "Заполните все обязательные поля.";
      return;
    }

    const userData = {
      name: registerForm.elements.name.value.trim(),
      surname: registerForm.elements.surname.value.trim(),
      email: registerForm.elements.email.value.trim(),
      phone: registerForm.elements.phone.value.trim(),
      password: registerForm.elements.password.value,
    };

    const button = registerForm.querySelector('button[type="submit"]');
    button.disabled = true;
    registerStatus.textContent = "Создаем профиль...";

    const { data, error } = await supabaseClient.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          surname: userData.surname,
          phone: userData.phone,
        },
      },
    });

    button.disabled = false;
    if (error) {
      registerStatus.textContent = error.message;
      return;
    }

    if (data.session && data.user) {
      await ensureProfile(data.user, userData);
      await renderCabinet();
      return;
    }

    registerStatus.textContent = "Регистрация прошла успешно.";
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideResetPanel();
    loginStatus.textContent = "";
    if (!loginForm.checkValidity()) {
      loginForm.classList.add("was-validated");
      loginStatus.textContent = "Введите логин и пароль.";
      return;
    }

    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    loginStatus.textContent = "Вход...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: loginForm.elements.login.value.trim(),
      password: loginForm.elements.password.value,
    });

    button.disabled = false;
    if (error) {
      loginStatus.textContent = "Пользователь не найден или пароль неверный.";
      return;
    }

    await ensureProfile(data.user);
    await renderCabinet();
  });

  loginForm.querySelector(".muted-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    showResetPanel();
  });

  resetButton?.addEventListener("click", submitPasswordReset);

  resetEmail?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submitPasswordReset();
  });

  document.querySelector("#logout-button").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    hideResetPanel();
    show("login");
  });

  renderCabinet();
}

function initAdminLogin() {
  const form = document.querySelector("#admin-login-form");
  if (!form) return;

  const status = document.querySelector("#admin-login-status");

  isAdminUser().then((isAdmin) => {
    if (isAdmin) window.location.href = "admin.html";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      status.textContent = "Введите e-mail и пароль администратора.";
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.textContent = "Проверяем доступ...";

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: form.elements.adminLogin.value.trim(),
      password: form.elements.adminPassword.value,
    });

    if (error) {
      status.textContent = "Неверный e-mail или пароль.";
      button.disabled = false;
      return;
    }

    const isAdmin = await isAdminUser();
    if (!isAdmin) {
      await supabaseClient.auth.signOut();
      status.textContent = "У этого пользователя нет роли admin.";
      button.disabled = false;
      return;
    }

    window.location.href = "admin.html";
  });
}

function adminProductPayload(form, editingProduct) {
  return {
    name: form.elements.namedItem("name").value.trim(),
    type: form.elements.namedItem("type").value,
    price: Number(form.elements.namedItem("price").value),
    quantity: Number(form.elements.namedItem("quantity").value),
    image: form.elements.namedItem("image").value.trim(),
    sort_order: editingProduct?.sortOrder ?? Date.now(),
    is_active: true,
  };
}

async function loadAdminOrders() {
  const { data, error } = await supabaseClient
    .from("orders")
    .select("*, order_items(id, product_id, quantity, price, product:products(*))")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin orders load error:", error);
    return { orders: [], error };
  }

  return { orders: data || [], error: null };
}

function orderItemsMarkup(order) {
  const items = Array.isArray(order.order_items) && order.order_items.length ? order.order_items : order.items;
  if (!Array.isArray(items) || !items.length) return "";

  return `
    <div class="admin-order-items">
      ${items.map((item, index) => `<p>${index + 1}. ${orderItemSummary(item)}</p>`).join("")}
    </div>
  `;
}

async function initAdmin() {
  const panel = document.querySelector("#admin-panel");
  const form = document.querySelector("#admin-product-form");
  if (!panel || !form) return;

  const isAllowed = await requireAdmin();
  if (!isAllowed) return;

  const list = document.querySelector("#admin-product-list");
  const orderList = document.querySelector("#admin-order-list");
  const orderForm = document.querySelector("#admin-order-form");
  const orderListStatus = document.querySelector("#admin-order-list-status");
  const status = document.querySelector("#admin-status");
  const orderStatus = document.querySelector("#admin-order-status");
  const submitButton = form.querySelector('button[type="submit"]');
  const orderSubmitButton = orderForm?.querySelector('button[type="submit"]');
  let editingId = "";
  let editingOrderId = "";

  panel.classList.remove("is-hidden");

  const renderProducts = async () => {
    const products = await loadProducts({ force: true, includeInactive: true });
    list.innerHTML = products.length
      ? products
        .map((item) => `
          <article class="admin-row ${item.isActive ? "" : "is-inactive"}">
            <img src="${escapeHtml(item.image)}" alt="" />
            <div>
              <h3>${escapeHtml(item.name)}</h3>
              <p>${escapeHtml(item.type)} · ${money(item.price)}</p>
              <p>Остаток: ${escapeHtml(item.quantity)} шт.</p>
              <p>Статус: ${item.isActive ? "активен" : "скрыт"}</p>
              <p>${escapeHtml(item.image)}</p>
            </div>
            <button type="button" data-edit="${escapeHtml(item.id)}">Редактировать</button>
            <button type="button" data-stock-plus="${escapeHtml(item.id)}">+10</button>
            <button type="button" data-toggle-active="${escapeHtml(item.id)}">${item.isActive ? "Скрыть" : "Вернуть"}</button>
          </article>
        `)
        .join("")
      : '<p class="empty-note">Позиции пока не добавлены.</p>';

    list.querySelectorAll("[data-edit]").forEach((button) => {
      button.addEventListener("click", async () => {
        const currentProducts = await loadProducts({ includeInactive: true });
        const item = currentProducts.find((product) => product.id === button.dataset.edit);
        if (!item) return;
        editingId = item.id;
        form.elements.namedItem("name").value = item.name;
        form.elements.namedItem("type").value = item.type;
        form.elements.namedItem("price").value = item.price;
        form.elements.namedItem("quantity").value = item.quantity;
        form.elements.namedItem("image").value = item.image;
        submitButton.textContent = "Сохранить изменения";
        status.textContent = "";
      });
    });

    list.querySelectorAll("[data-stock-plus]").forEach((button) => {
      button.addEventListener("click", async () => {
        const currentProducts = await loadProducts({ force: true, includeInactive: true });
        const item = currentProducts.find((product) => product.id === button.dataset.stockPlus);
        if (!item) return;
        const { error } = await supabaseClient
          .from("products")
          .update({ quantity: Number(item.quantity || 0) + 10 })
          .eq("id", item.id);
        if (error) {
          status.textContent = "Не удалось пополнить остаток.";
          console.error("Product stock update error:", error);
          return;
        }
        status.textContent = "Остаток увеличен на 10.";
        productCache = null;
        await renderProducts();
      });
    });

    list.querySelectorAll("[data-toggle-active]").forEach((button) => {
      button.addEventListener("click", async () => {
        const currentProducts = await loadProducts({ force: true, includeInactive: true });
        const item = currentProducts.find((product) => product.id === button.dataset.toggleActive);
        if (!item) return;
        const { error } = await supabaseClient
          .from("products")
          .update({ is_active: !item.isActive })
          .eq("id", item.id);
        if (error) {
          status.textContent = "Не удалось изменить видимость товара.";
          console.error("Product visibility error:", error);
          return;
        }
        status.textContent = item.isActive ? "Товар скрыт с сайта." : "Товар снова виден на сайте.";
        productCache = null;
        await renderProducts();
      });
    });
  };

  const renderOrders = async () => {
    const { orders, error } = await loadAdminOrders();
    if (error) {
      orderList.innerHTML = '<p class="empty-note">Не удалось загрузить заказы.</p>';
      return;
    }

    orderList.innerHTML = orders.length
      ? orders.map((order, index) => `
        <article class="admin-row admin-order-row">
          <div>
            <h3>Заказ ${index + 1}</h3>
            <p>№ ${escapeHtml(orderNumber(order.id))}</p>
            <p>Статус: ${escapeHtml(order.status || "new")}</p>
            <p>${escapeHtml(formatDate(order.created_at))}</p>
            <p>Выдача: ${escapeHtml(order.pickup)}</p>
            <p>Телефон: ${escapeHtml(order.phone)}</p>
            <p>Способ связи: ${escapeHtml(order.notify)}</p>
            <p>${money(order.total)}</p>
            ${orderItemsMarkup(order)}
            <button type="button" data-order-edit="${escapeHtml(order.id)}">Редактировать</button>
            <button type="button" data-order-delete="${escapeHtml(order.id)}">Удалить</button>
          </div>
        </article>
      `).join("")
      : '<p class="empty-note">Новых заказов пока нет</p>';

    orderList.querySelectorAll("[data-order-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const order = orders.find((item) => item.id === button.dataset.orderEdit);
        if (!order || !orderForm) return;

        editingOrderId = order.id;
        orderForm.classList.remove("is-hidden");
        orderForm.elements.namedItem("orderNumber").value = orderNumber(order.id);
        orderForm.elements.namedItem("status").value = order.status || "pending_payment";
        orderForm.elements.namedItem("pickup").value = order.pickup || "";
        orderForm.elements.namedItem("phone").value = order.phone || "";
        orderForm.elements.namedItem("notify").value = order.notify || "SMS-уведомление";
        orderForm.elements.namedItem("total").value = Number(order.total || 0);
        orderStatus.textContent = "";
        orderForm.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    orderList.querySelectorAll("[data-order-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!window.confirm("Удалить этот заказ?")) return;
        const { error: deleteError } = await supabaseClient
          .from("orders")
          .delete()
          .eq("id", button.dataset.orderDelete);

        if (deleteError) {
          orderListStatus.textContent = "Не удалось удалить заказ.";
          console.error("Order delete error:", deleteError);
          return;
        }

        if (editingOrderId === button.dataset.orderDelete) {
          editingOrderId = "";
          orderForm?.reset();
          orderForm?.classList.add("is-hidden");
        }

        orderListStatus.textContent = "Заказ удалён.";
        await renderOrders();
      });
    });
  };

  orderForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editingOrderId) {
      orderStatus.textContent = "Сначала выберите заказ для редактирования.";
      return;
    }
    if (!orderForm.checkValidity()) {
      orderForm.classList.add("was-validated");
      orderStatus.textContent = "Заполните все поля заказа.";
      return;
    }

    orderSubmitButton.disabled = true;
    orderStatus.textContent = "Сохраняем заказ...";

    const { error } = await supabaseClient
      .from("orders")
      .update({
        status: orderForm.elements.namedItem("status").value,
        pickup: orderForm.elements.namedItem("pickup").value.trim(),
        phone: orderForm.elements.namedItem("phone").value.trim(),
        notify: orderForm.elements.namedItem("notify").value,
        total: Number(orderForm.elements.namedItem("total").value),
      })
      .eq("id", editingOrderId);

    orderSubmitButton.disabled = false;
    if (error) {
      orderStatus.textContent = "Не удалось сохранить заказ.";
      console.error("Order update error:", error);
      return;
    }

    editingOrderId = "";
    orderForm.reset();
    orderForm.classList.add("is-hidden");
    orderStatus.textContent = "Заказ сохранён.";
    await renderOrders();
  });

  orderForm?.addEventListener("reset", () => {
    editingOrderId = "";
    orderForm.classList.add("is-hidden");
    orderForm.classList.remove("was-validated");
    orderStatus.textContent = "";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      status.textContent = "Заполните все поля позиции.";
      return;
    }

    const currentProducts = await loadProducts({ includeInactive: true });
    const editingProduct = currentProducts.find((product) => product.id === editingId);
    const payload = adminProductPayload(form, editingProduct);

    submitButton.disabled = true;
    status.textContent = "Сохраняем позицию...";

    const request = editingId
      ? supabaseClient.from("products").update(payload).eq("id", editingId)
      : supabaseClient.from("products").insert(payload);
    const { error } = await request;

    submitButton.disabled = false;
    if (error) {
      status.textContent = "Не удалось сохранить позицию.";
      console.error("Product save error:", error);
      return;
    }

    editingId = "";
    form.reset();
    submitButton.textContent = "Добавить позицию";
    status.textContent = "Позиция сохранена в базе данных.";
    productCache = null;
    await renderProducts();
  });

  form.addEventListener("reset", () => {
    editingId = "";
    form.classList.remove("was-validated");
    submitButton.textContent = "Добавить позицию";
    status.textContent = "";
  });

  document.querySelector("#admin-logout")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "admin-login.html";
  });

  await renderProducts();
  await renderOrders();

  subscribeToTable("products", async () => {
    productCache = null;
    await renderProducts();
  }, "admin-products");
  subscribeToTable("orders", renderOrders, "admin-orders");
}

document.addEventListener("DOMContentLoaded", async () => {
  await renderManagedMenu();
  await initOrderBuilder();
  await renderCart();
  initCheckout();
  initAccount();
  initAdminLogin();
  initAdmin();
  initPaymentPage();
  initOrderSuccessPage();
});
