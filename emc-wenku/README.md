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

## 云服务器部署准备

```sh
npm run db:generate
npm run api:build
npm run build
```

仓库已附带单机 Docker Compose 部署配置：API、Nginx 静态前端、PostgreSQL 17 和 Caddy HTTPS 代理。PostgreSQL 和 API 只在 Docker 内部网络通信；公网仅映射 80/443。数据库和附件使用独立持久化卷。详细服务拓扑见 `compose.production.yml`。

首次部署前，在 Ubuntu 24.04 服务器上安装 Docker Engine 与 Compose 插件，然后从 GitHub 克隆最新代码。Docker 官方 Ubuntu 安装步骤见 <https://docs.docker.com/engine/install/ubuntu/>。本项目依赖 Docker Compose，不要将数据库 5432 或 API 3000 加入阿里云安全组。

1. 复制并编辑生产环境变量文件：

   ```sh
   cp deploy/production.env.example .env.production
   chmod 600 .env.production
   ```

   设置 `POSTGRES_PASSWORD` 为随机 64 位十六进制密钥；之后再将 `SITE_ADDRESS` 替换为最终域名。`.env.production` 已被 Git 忽略。域名未确定前不要启动 Caddy 公网服务。2 GB 内存实例构建镜像容易内存不足，按下方步骤在本地构建并通过 SSH/SCP 传输镜像包即可，无需依赖服务器访问 Docker Hub 或购买镜像加速服务。

2. 在本地安装了 Docker 的开发电脑上构建并打包 Linux/amd64 镜像。这样可避免低内存服务器构建镜像。使用仓库提供的示例环境文件即可构建；示例密码不会写入镜像：

   ```sh
   docker compose --parallel 1 --env-file deploy/production.env.example -f compose.production.yml build
   docker pull postgres:17-alpine
   docker pull caddy:2-alpine
   docker save -o emc-wenku.images.tar emc-wenku-api:production emc-wenku-web:production emc-wenku-migrate:production postgres:17-alpine caddy:2-alpine
   ```

   将 `emc-wenku.images.tar` 通过 SSH/SCP 传到服务器项目目录 `/opt/wenku/emc-wenku/`，然后在服务器该目录执行 `docker load -i emc-wenku.images.tar`。镜像包较大，不要提交到 Git。Docker Compose 配置使用固定镜像名和 `pull_policy: never`，只运行已加载的本地镜像，不会尝试访问 Docker Hub。

   在服务器项目目录中确认 `.env.production` 已设置随机数据库密码后，启动数据库：

   ```sh
   docker compose --env-file .env.production -f compose.production.yml up -d --no-build postgres
   ```

3. 应用生产数据库迁移，并初始化分类字典：

   ```sh
   docker compose --env-file .env.production -f compose.production.yml run --rm migrate
   docker compose --env-file .env.production -f compose.production.yml run --rm migrate npm run db:init:production
   ```

   生产初始化只写入分类和文库制度分类，不会创建测试文献、测试账号或默认管理员。`npm run db:seed` 明确禁止用于生产库。

4. 用安全密码创建首位管理员，然后启动网站服务：

   ```sh
   read -s -p '管理员密码: ' ADMIN_PASSWORD; echo
   export ADMIN_PASSWORD
   docker compose --env-file .env.production -f compose.production.yml run --rm -e ADMIN_PASSWORD migrate npm run admin:create -- wenku-admin admin@example.com
   unset ADMIN_PASSWORD
   docker compose --env-file .env.production -f compose.production.yml up -d
   ```

   把示例邮箱替换为管理员实际邮箱。最终域名确定后，将其写入 `.env.production` 的 `SITE_ADDRESS`，在域名 DNS 配好服务器 IP、备案方案确认且安全组开放 80/443 后，Caddy 会自动申请 HTTPS 证书。

生产数据库与附件目录都是独立持久化卷；重建容器不会删除它们，但这不构成备份。正式导入本地数据前，先决定是否保留开发数据库中的虚构测试文献和测试账号。需要保留的真实数据必须同时迁移 PostgreSQL 备份和 `private-uploads` 附件文件，不能只复制代码或只恢复数据库。附件目录不进入 Git，也不可作为静态目录公开。

目前应优先在服务器初始化空的生产数据库并重新录入要保留的正式资料。不要直接恢复 `emc_wenku_dev` 整库：本地种子脚本会插入虚构测试文献，端到端验证也可能留下测试账号和投稿。若将来确实需要迁移真实用户/投稿数据，应先筛除测试数据，并在独立临时数据库上演练 PostgreSQL 与附件目录的成套恢复，再切换线上服务。

此部署配置是可复现的迁移基础，不代表所有上线事项已完成。对外开放前仍须完成文库制度、隐私与版权审查、CSRF 防护、跨实例限流和会话、恶意附件扫描、备份恢复演练及安全验证。当前附件存储为本地持久化卷，后续可切换到对象存储。

## 本地生产构建检查

```sh
npm run api:build
npm run build
```

## v2.0 已落地范围

- 数据库模型覆盖用户/会话、正式文献与版本、八个主分类及政论文书下属的十个子分类、投稿与投稿版本、审核记录、收藏、元文献及版本、浏览事件和审计日志。
- 服务端账号注册、登录、注销和会话验证；HttpOnly Cookie；密码使用 scrypt 哈希；服务端角色守卫。
- 公开文献目录、详情、关键词/主分类/政论文书子分类过滤、分页、最近新增、热门排行与真实统计 API。
- 投稿草稿、修改、提交、撤回、本人投稿记录及审核意见。
- 审核员处理、退回、拒绝或通过；管理员单独发布。审核状态、文献创建、首个正式版本与审计记录通过数据库事务处理。
- 服务端收藏；公开文库首页、政论文书子分类浏览和元文献展示入口。
- 投稿附件：支持 PDF、JPG/JPEG、PNG、WebP、DOCX；每文件最多 10 MB、每篇最多 10 个。附件在投稿审核期间保存在 API 私有目录，只有投稿人和审核人员能下载；管理员发布后才开放公开下载。
- 生产分类初始化脚本仅创建分类字典，不创建馆藏、投稿、用户或默认管理员；本地开发种子数据只允许写入 `_dev`/`_test` 数据库。私有本地测试文件夹不纳入版本控制。

## 当前限制与正式上线前工作

该仓库提供可继续开发的 v2.0 运营骨架和单机生产部署模板，不等同于已完成生产上线。尚未在阿里云实例上实际部署，也未做最终域名、HTTPS、生产数据恢复和备份恢复演练。

正式开放前仍需完成并验证：邮箱验证与密码找回、附件恶意内容扫描与生产对象存储集成、可靠的跨实例限流/会话存储、完整 CSRF 防护、管理员用户/主分类/政论文书子分类/元文献管理界面、更多文献修订和撤回操作、正式文库制度与隐私/版权内容、自动备份和恢复演练、安全与端到端测试、生产环境部署及监控。附件目录需要使用持久化磁盘并纳入备份；不要把附件目录映射为静态网站目录。不要在这些工作完成前把开放注册和投稿当作可运营服务。

GitHub Pages 只能托管静态前端，不提供 PostgreSQL 或 API。要让登录、投稿、审核等功能对外可用，需先把 API 与数据库部署到支持 Node.js/PostgreSQL 的服务器，并在构建时设置 `VITE_API_BASE_URL` 指向对应 API；不要把生产密钥写入 `VITE_` 变量。
