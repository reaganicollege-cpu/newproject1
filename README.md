# 我的物品陈列

一个静态可上线的个人物品陈列网页。默认使用浏览器本地保存；配置 Supabase 后支持云端同步、图片上传和公开只读展览页。

## 文件结构

- `index.html`：编辑和管理页面
- `public.html`：公开只读展览页
- `styles.css`：页面样式
- `script.js`：编辑页逻辑
- `public.js`：公开页逻辑
- `config.js`：Supabase 配置
- `supabase-client.js`：Supabase 数据和图片上传适配
- `supabase/schema.sql`：数据库和存储桶脚本
- `vercel.json` / `netlify.toml`：静态部署配置

## 本地使用

直接打开 `index.html` 即可使用。没有配置 Supabase 时，数据会保存在当前浏览器本地。

## 开启云端保存和图片上传

1. 创建 Supabase 项目。
2. 在 Supabase SQL Editor 中运行 `supabase/schema.sql`。
3. 打开 `config.js`，填入：

```js
window.GALLERY_CONFIG = {
  supabaseUrl: "你的 Supabase Project URL",
  supabaseAnonKey: "你的 Supabase anon public key",
  itemsTable: "gallery_items",
  storageBucket: "gallery-images"
};
```

4. 重新打开 `index.html`，之后新增和编辑会同步到 Supabase。

## 公开展览页

编辑页右上角的 `↗` 按钮会复制公开展览链接。链接格式类似：

```text
public.html?gallery=你的-gallery-id
```

部署上线后，这个链接可以发给别人，只能浏览，不能编辑。

## 部署

### Vercel

1. 把整个文件夹上传到 GitHub。
2. 在 Vercel 新建项目并选择这个仓库。
3. Framework Preset 选择 `Other`。
4. Build Command 留空，Output Directory 填 `.`。
5. 部署完成后访问 Vercel 给你的域名。

### Netlify

1. 把整个文件夹上传到 GitHub。
2. 在 Netlify 新建站点并选择这个仓库。
3. Build Command 留空，Publish directory 填 `.`。
4. 部署完成后访问 Netlify 给你的域名。

### GitHub Pages

1. 上传到 GitHub 仓库。
2. 打开仓库 Settings → Pages。
3. Source 选择 `Deploy from a branch`。
4. 选择 `main` 分支和根目录 `/`。

## 重要说明

当前 Supabase 脚本使用公开读写策略，适合个人原型、公开展览或低风险使用。如果要做成多人账号产品，应加入登录系统，并把 RLS 政策改成“只能读写自己的 gallery”。
