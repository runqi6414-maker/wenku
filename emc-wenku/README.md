# EarthMC 国区玩家文库 2.0

Vue 3 + Vite 前端、NestJS REST API、Prisma ORM 与 PostgreSQL 组成的模块化单体。正式馆藏、用户账户、投稿、审核记录、收藏和浏览事件均以服务端数据库为准；浏览器本地存储只保存主题偏好。

## 本地开发环境

需要 Node.js 22.18+。开发数据库使用 PostgreSQL 17。可以使用 Docker Compose 启动数据库；如果本机没有 Docker，请先安装 PostgreSQL 并准备一个仅用于开发的数据库。

1. 安装依赖：

   ```sh
   npm install
   ```

2. 复制 `.env.example` 为 `.env`，设置仅用于本机开发的 `POSTGRES_PASSWORD` 和对应 `DATABASE_URL`。不要将 `.env` 或任何真实密钥提交到 Git。

3. 启动本地 PostgreSQL（Docker 可用时）：

   ```sh
   docker compose up -d postgres
   ```

4. 生成 Prisma 客户端、建立开发数据库结构并初始化分类：

   ```sh
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

   初始化脚本创建分类字典及一篇明确标注为虚构的测试文献，并拒绝连接生产数据库。不会创建测试浏览量或默认账户。开发/测试/生产数据库必须分别配置。

5. 需要后台账号时，使用安全密码创建初始管理员。PowerShell 示例：

   ```powershell
   $env:ADMIN_PASSWORD = Read-Host "管理员密码（至少 12 位）"
   npm run admin:create -- wenku-admin admin@example.com
   Remove-Item Env:ADMIN_PASSWORD
   ```

   管理员密码通过 `scrypt` 哈希保存，不提供公开注册管理员或默认密码。

6. 分别启动 API 和前端开发服务器：

   ```sh
   npm run api:dev
   npm run dev
   ```

   API 默认在 `http://localhost:3000/api/v1`，Vite 开发服务器默认在 `http://localhost:5173` 并将 `/api` 转发给 API。

## 生产构建

```sh
npm run api:build
npm run build
```

生产部署必须通过 HTTPS 反向代理公开前端和 API，设置 `NODE_ENV=production`、真实 `DATABASE_URL`、严格的 `FRONTEND_ORIGIN`，并配置数据库与附件备份。数据库不得暴露到公网。

## v2.0 已落地范围

- 数据库模型覆盖用户/会话、正式文献与版本、分类与时期、投稿与投稿版本、审核记录、收藏、元文献及版本、浏览事件和审计日志。
- 服务端账号注册、登录、注销和会话验证；HttpOnly Cookie；密码使用 scrypt 哈希；服务端角色守卫。
- 公开文献目录、详情、关键词/分类/时期过滤、分页、最近新增、热门排行与真实统计 API。
- 投稿草稿、修改、提交、撤回、本人投稿记录及审核意见。
- 审核员处理、退回、拒绝或通过；管理员单独发布。审核状态、文献创建、首个正式版本与审计记录通过数据库事务处理。
- 服务端收藏；公开文库首页、历史时期浏览和元文献展示入口。
- 仅初始化分类字典，不添加测试馆藏或默认管理员。私有本地测试文件夹不纳入版本控制。

## 当前限制与正式上线前工作

该仓库提供可继续开发的 v2.0 本地运营骨架，不等同于已完成生产上线。当前环境没有 Docker/PostgreSQL，数据库迁移、注册到发布的端到端流程无法在本机实际运行。

正式开放前仍需完成并验证：邮箱验证与密码找回、附件上传与隔离存储、可靠的跨实例限流/会话存储、完整 CSRF 防护、管理员用户/分类/时期/元文献管理界面、更多文献修订和撤回操作、正式文库制度与隐私/版权内容、自动备份和恢复演练、安全与端到端测试、生产环境部署及监控。不要在这些工作完成前把开放注册和投稿当作可运营服务。

GitHub Pages 只能托管静态前端，不提供 PostgreSQL 或 API。要让登录、投稿、审核等功能对外可用，需先把 API 与数据库部署到支持 Node.js/PostgreSQL 的服务器，并在构建时设置 `VITE_API_BASE_URL` 指向对应 API；不要把生产密钥写入 `VITE_` 变量。
