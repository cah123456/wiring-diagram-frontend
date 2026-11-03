# GRIDLINE Frontend

开关柜接线图编辑器的 Vue 3 前端。完整说明见仓库根目录 [README.md](../README.md)。

```bash
npm install
npm run dev       # http://localhost:5173，/api 代理到 localhost:8080
npm run build     # 类型检查 + 生产构建
npm run preview   # 预览生产构建
```

技术栈：Vue 3、TypeScript、Vite、Pinia、Vue Router、Element Plus、Axios。绘图使用原生 SVG 和自研端口/正交路由逻辑。
