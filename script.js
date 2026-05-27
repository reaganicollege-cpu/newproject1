const STORAGE_KEY = "personal-object-gallery";
const VIEW_KEY = "personal-object-gallery-view";
const GALLERY_ID_KEY = "personal-object-gallery-id";

const now = Date.now();
const defaultItems = [
  {
    id: crypto.randomUUID(),
    name: "白釉马克杯",
    image: "",
    category: "器物",
    location: "餐边柜上层",
    note: "日常使用留下的轻微釉痕，让它像一件安静的小雕塑。",
    featured: true,
    createdAt: now - 3000,
    updatedAt: now - 3000
  },
  {
    id: crypto.randomUUID(),
    name: "旧胶片相机",
    image: "",
    category: "收藏",
    location: "书架第三层",
    note: "金属机身和磨损边角保留了时间感，适合作为视觉焦点。",
    featured: false,
    createdAt: now - 2000,
    updatedAt: now - 2000
  },
  {
    id: crypto.randomUUID(),
    name: "原木小凳",
    image: "",
    category: "家具",
    location: "窗边",
    note: "浅木色、直线条，适合承托植物或单独陈列。",
    featured: false,
    createdAt: now - 1000,
    updatedAt: now - 1000
  }
];

let items = loadItems();
let activeCategory = "全部";
let editingId = null;
let currentView = localStorage.getItem(VIEW_KEY) || "gallery";
let isCloudReady = Boolean(window.galleryCloud?.enabled);
let isSyncing = false;

const galleryId = getGalleryId();
const form = document.querySelector("#itemForm");
const nameInput = document.querySelector("#nameInput");
const imageInput = document.querySelector("#imageInput");
const imageFileInput = document.querySelector("#imageFileInput");
const categoryInput = document.querySelector("#categoryInput");
const locationInput = document.querySelector("#locationInput");
const noteInput = document.querySelector("#noteInput");
const featuredInput = document.querySelector("#featuredInput");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const grid = document.querySelector("#itemGrid");
const filters = document.querySelector("#filters");
const emptyState = document.querySelector("#emptyState");
const template = document.querySelector("#itemTemplate");
const clearButton = document.querySelector("#clearButton");
const exportButton = document.querySelector("#exportButton");
const importButton = document.querySelector("#importButton");
const importInput = document.querySelector("#importInput");
const shareButton = document.querySelector("#shareButton");
const totalCount = document.querySelector("#totalCount");
const categoryCount = document.querySelector("#categoryCount");
const featuredCount = document.querySelector("#featuredCount");
const viewButtons = document.querySelectorAll(".view-button");

function getGalleryId() {
  const saved = localStorage.getItem(GALLERY_ID_KEY);
  if (saved) return saved;

  const id = crypto.randomUUID();
  localStorage.setItem(GALLERY_ID_KEY, id);
  return id;
}

function loadItems() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return defaultItems;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map(normalizeItem) : defaultItems;
  } catch {
    return defaultItems;
  }
}

function normalizeItem(item) {
  const timestamp = item.createdAt || Date.now();
  return {
    id: item.id || crypto.randomUUID(),
    name: item.name || "未命名物品",
    image: item.image || item.image_url || "",
    category: item.category || "未分类",
    location: item.location || "未记录位置",
    note: item.note || "",
    featured: Boolean(item.featured),
    createdAt: timestamp,
    updatedAt: item.updatedAt || timestamp
  };
}

function saveLocalItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

async function persistItems({ syncCloud = true } = {}) {
  saveLocalItems();
  if (!syncCloud || !isCloudReady || isSyncing) return;

  try {
    isSyncing = true;
    await window.galleryCloud.saveItems(galleryId, items);
  } catch (error) {
    console.warn("云端同步失败，已保留本地数据。", error);
  } finally {
    isSyncing = false;
  }
}

async function loadCloudItems() {
  if (!isCloudReady) return;

  try {
    const cloudItems = await window.galleryCloud.listItems(galleryId);
    if (cloudItems.length) {
      items = cloudItems.map(normalizeItem);
      saveLocalItems();
      render();
      return;
    }

    await window.galleryCloud.saveItems(galleryId, items);
  } catch (error) {
    console.warn("读取云端数据失败，继续使用本地数据。", error);
  }
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
  grid.className = currentView === "catalog" ? "item-grid catalog-view" : "item-grid";
  grid.innerHTML = "";
  emptyState.hidden = visibleItems.length > 0;

  visibleItems.forEach((item, index) => {
    const card = template.content.firstElementChild.cloneNode(true);
    const category = item.category || "未分类";
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
    card.querySelector(".tag").textContent = category;
    card.querySelector(".note").textContent = item.note || "暂无展签说明";
    card.querySelector(".meta").textContent = `${item.location || "未记录位置"} · 加入于 ${formatDate(item.createdAt)}`;

    const featureButton = card.querySelector(".feature");
    featureButton.textContent = item.featured ? "取消精选" : "精选";
    featureButton.addEventListener("click", () => toggleFeatured(item.id));

    card.querySelector(".copy").addEventListener("click", (event) => copyItem(item, event.currentTarget));
    card.querySelector(".edit").addEventListener("click", () => editItem(item.id));
    card.querySelector(".delete").addEventListener("click", () => deleteItem(item.id));

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

function renderViewButtons() {
  viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === currentView);
  });
}

function render() {
  if (!getCategories().includes(activeCategory)) activeCategory = "全部";
  renderSummary();
  renderFilters();
  renderViewButtons();
  renderItems();
}

function resetForm() {
  editingId = null;
  form.reset();
  form.querySelector(".primary").textContent = "加入陈列";
}

function editItem(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;

  editingId = id;
  nameInput.value = item.name;
  imageInput.value = item.image;
  categoryInput.value = item.category;
  locationInput.value = item.location;
  noteInput.value = item.note;
  featuredInput.checked = item.featured;
  form.querySelector(".primary").textContent = "保存";
  nameInput.focus();
}

async function deleteItem(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item || !confirm(`确定移除「${item.name}」吗？`)) return;

  items = items.filter((entry) => entry.id !== id);
  await persistItems();
  render();
}

async function toggleFeatured(id) {
  items = items.map((item) =>
    item.id === id ? { ...item, featured: !item.featured, updatedAt: Date.now() } : item
  );
  await persistItems();
  render();
}

async function copyItem(item, button) {
  const text = `${item.name}\n展区：${item.category}\n位置：${item.location}\n说明：${item.note || "暂无"}`;
  await navigator.clipboard.writeText(text);
  showButtonState(button, "已复制");
}

function exportItems() {
  const payload = {
    version: 2,
    galleryId,
    exportedAt: new Date().toISOString(),
    items
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `我的物品陈列-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importItems(file) {
  const text = await file.text();
  const imported = JSON.parse(text);
  const importedItems = Array.isArray(imported) ? imported : imported.items;
  if (!Array.isArray(importedItems)) throw new Error("导入文件格式不正确");

  const existingKeys = new Set(items.map((item) => `${item.name}-${item.location}`));
  const merged = [...items];

  importedItems.map(normalizeItem).forEach((item) => {
    const key = `${item.name}-${item.location}`;
    if (!existingKeys.has(key)) {
      merged.push(item);
      existingKeys.add(key);
    }
  });

  items = merged;
  activeCategory = "全部";
  await persistItems();
  render();
}

async function uploadSelectedImage() {
  const file = imageFileInput.files[0];
  if (!file) return imageInput.value.trim();

  if (!isCloudReady) {
    throw new Error("图片上传需要先配置 Supabase。也可以继续使用图片地址。");
  }

  return window.galleryCloud.uploadImage(galleryId, file);
}

function getPublicUrl() {
  const publicUrl = new URL("public.html", window.location.href);
  publicUrl.searchParams.set("gallery", galleryId);
  return publicUrl.href;
}

async function copyPublicUrl() {
  await navigator.clipboard.writeText(getPublicUrl());
  showButtonState(shareButton, "✓");
}

function showButtonState(button, text) {
  const oldText = button.textContent;
  button.textContent = text;
  setTimeout(() => {
    button.textContent = oldText;
  }, 1200);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = form.querySelector(".primary");
  const oldText = submitButton.textContent;
  submitButton.textContent = "保存中";
  submitButton.disabled = true;

  try {
    const existing = items.find((entry) => entry.id === editingId);
    const timestamp = Date.now();
    const item = {
      id: editingId || crypto.randomUUID(),
      name: nameInput.value.trim(),
      image: await uploadSelectedImage(),
      category: categoryInput.value.trim() || "未分类",
      location: locationInput.value.trim() || "未记录位置",
      note: noteInput.value.trim(),
      featured: featuredInput.checked,
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp
    };

    if (editingId) {
      items = items.map((entry) => (entry.id === editingId ? item : entry));
    } else {
      items = [item, ...items];
    }

    activeCategory = "全部";
    await persistItems();
    resetForm();
    render();
  } catch (error) {
    alert(error.message);
  } finally {
    submitButton.textContent = oldText === "保存中" ? "加入陈列" : oldText;
    submitButton.disabled = false;
  }
});

clearButton.addEventListener("click", resetForm);
searchInput.addEventListener("input", renderItems);
sortSelect.addEventListener("change", renderItems);
exportButton.addEventListener("click", exportItems);
shareButton.addEventListener("click", copyPublicUrl);
importButton.addEventListener("click", () => importInput.click());

importInput.addEventListener("change", async () => {
  const file = importInput.files[0];
  if (!file) return;

  try {
    await importItems(file);
  } catch (error) {
    alert(error.message);
  } finally {
    importInput.value = "";
  }
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentView = button.dataset.view;
    localStorage.setItem(VIEW_KEY, currentView);
    render();
  });
});

render();
loadCloudItems();
