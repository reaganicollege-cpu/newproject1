(function () {
  const config = window.GALLERY_CONFIG || {};
  const hasConfig = Boolean(config.supabaseUrl && config.supabaseAnonKey);
  const hasClient = Boolean(window.supabase?.createClient);

  if (!hasConfig || !hasClient) {
    window.galleryCloud = { enabled: false };
    return;
  }

  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  const itemsTable = config.itemsTable || "gallery_items";
  const storageBucket = config.storageBucket || "gallery-images";

  function toItem(record) {
    return {
      id: record.id,
      name: record.name,
      image: record.image_url || "",
      category: record.category || "未分类",
      location: record.location || "未记录位置",
      note: record.note || "",
      featured: Boolean(record.featured),
      createdAt: new Date(record.created_at).getTime(),
      updatedAt: new Date(record.updated_at).getTime()
    };
  }

  function toRecord(galleryId, item) {
    return {
      id: item.id,
      gallery_id: galleryId,
      name: item.name,
      image_url: item.image || "",
      category: item.category || "未分类",
      location: item.location || "未记录位置",
      note: item.note || "",
      featured: Boolean(item.featured),
      created_at: new Date(item.createdAt || Date.now()).toISOString(),
      updated_at: new Date(item.updatedAt || Date.now()).toISOString()
    };
  }

  async function listItems(galleryId) {
    const { data, error } = await client
      .from(itemsTable)
      .select("*")
      .eq("gallery_id", galleryId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(toItem);
  }

  async function saveItems(galleryId, items) {
    const records = items.map((item) => toRecord(galleryId, item));
    const ids = records.map((record) => record.id);

    if (records.length) {
      const { error } = await client.from(itemsTable).upsert(records, { onConflict: "id" });
      if (error) throw error;
    }

    let deleteQuery = client.from(itemsTable).delete().eq("gallery_id", galleryId);
    if (ids.length) {
      deleteQuery = deleteQuery.not("id", "in", `(${ids.join(",")})`);
    }
    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw deleteError;
  }

  async function uploadImage(galleryId, file) {
    const extension = file.name.split(".").pop() || "jpg";
    const path = `${galleryId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from(storageBucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });

    if (error) throw error;

    const { data } = client.storage.from(storageBucket).getPublicUrl(path);
    return data.publicUrl;
  }

  window.galleryCloud = {
    enabled: true,
    listItems,
    saveItems,
    uploadImage
  };
})();
