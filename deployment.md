# 部署说明

这个项目是纯静态网页，可以直接部署到 Vercel、Netlify 或 GitHub Pages。

上线前建议检查：

- `config.js` 是否已填 Supabase 配置。
- `supabase/schema.sql` 是否已在 Supabase 执行。
- Supabase Storage 的 `gallery-images` bucket 是否为 public。
- 公开展览页 `public.html?gallery=...` 是否能读取到数据。

如果暂时不需要云端功能，可以不填 `config.js`，网页仍可本地使用。
