const params = new URLSearchParams(window.location.search);
const galleryId = params.get("gallery");
const LOCAL_GALLERY_ID_KEY = "personal-object-gallery-id";
const LOCAL_ITEMS_KEY = "personal-object-gallery";

let items = [];
let activeCategory = "全部";

const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const grid = document.querySelector("#itemGrid");
const filters = document.querySelector("#filters");
const emptyState = document.querySelector("#emptyState");
const template = document.querySelector("#itemTemplate");
const totalCount = document.querySelector("#totalCount");
const categoryCount = document.querySelector("#categoryCount");
const featuredCount = document.querySelector("#featuredCount");

function normalizeItem(item) {
  const timestamp = item.createdAt || Date.now();
  return {
    id: item.id || crypto.randomUUID(),
    name: item.name || "未命名物品",
    image: item.image || "",
    category: item.category || "未分类",
    location: item.location || "未记录位置",
    note: item.note || "",
    featured: Boolean(item.featured),
    createdAt: timestamp,
    updatedAt: item.updatedAt || timestamp
  };
}

function getCategories() {
  return ["全部", ...new Set(items.map((item) => item.category || "未分类"))];
}

function getVisibleItems() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const category = item.category || "未分类";
    const matchesCategory = activeCategory === "全部" || category === activeCategory;
    const searchable = `${item.name} ${category} ${item.location} ${item.note}`.toLowerCase();
    return matchesCategory && searchable.includes(query);
  });

  return filtered.sort((a, b) => {
    if (sortSelect.value === "curated" && a.featured !== b.featured) return a.featured ? -1 : 1;
    if (sortSelect.value === "newest") return b.createdAt - a.createdAt;
    if (sortSelect.value === "name") return a.name.localeCompare(b.name, "zh-Hans-CN");
    if (sortSelect.value === "category") return a.category.localeCompare(b.category, "zh-Hans-CN");
    return b.updatedAt - a.updatedAt;
  });
}

function renderSummary() {
  totalCount.textContent = items.length;
  categoryCount.textContent = Math.max(getCategories().length - 1, 0);
  featuredCount.textContent = items.filter((item) => item.featured).length;
}

function renderFilters() {
  filters.innerHTML = "";

  getCategories().forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter${category === activeCategory ? " active" : ""}`;
    button.textContent = category;
    button.addEventListener("click", () => {
      activeCategory = category;
      render();
    });
    filters.append(button);
  });
}

function renderItems() {
  const visibleItems = getVisibleItems();
  grid.innerHTML = "";
  emptyState.hidden = visibleItems.length > 0;

  visibleItems.forEach((item, index) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const image = card.querySelector("img");
    const placeholder = card.querySelector(".placeholder");

    card.classList.toggle("is-featured", item.featured);
    card.style.setProperty("--hue", `${(index * 37) % 360}`);

    if (item.image) {
      image.src = item.image;
      image.alt = item.name;
      placeholder.hidden = true;
    } else {
      image.hidden = true;
      placeholder.textContent = item.name.trim().slice(0, 1).toUpperCase();
    }

    card.querySelector(".accession").textContent = item.featured ? "精选展品" : `藏品 ${String(index + 1).padStart(2, "0")}`;
    card.querySelector("h3").textContent = item.name;
    card.querySelector(".tag").textContent = item.category || "未分类";
    card.querySelector(".note").textContent = item.note || "暂无展签说明";
    card.querySelector(".meta").textContent = `${item.location || "未记录位置"} · 加入于 ${formatDate(item.createdAt)}`;

    grid.append(card);
  });
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(timestamp);
}

function render() {
  if (!getCategories().includes(activeCategory)) activeCategory = "全部";
  renderSummary();
  renderFilters();
  renderItems();
}

async function loadPublicItems() {
  if (!galleryId) {
    render();
    return;
  }

  if (!window.galleryCloud?.enabled) {
    const localGalleryId = localStorage.getItem(LOCAL_GALLERY_ID_KEY);
    const localItems = localStorage.getItem(LOCAL_ITEMS_KEY);
    if (localGalleryId === galleryId && localItems) {
      items = JSON.parse(localItems).map(normalizeItem);
    }
    render();
    return;
  }

  try {
    const cloudItems = await window.galleryCloud.listItems(galleryId);
    items = cloudItems.map(normalizeItem);
  } catch (error) {
    console.warn("读取公开展览失败。", error);
  }

  render();
}

searchInput.addEventListener("input", renderItems);
sortSelect.addEventListener("change", renderItems);

loadPublicItems();
