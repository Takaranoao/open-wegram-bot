# Open Wegram Bot - OWB
## 一个让人呼吸顺畅的 Telegram 双向私聊机器人 🤖（零费用）
### *LivegramBot 不死，战斗不止！*

简体中文 | [English](README_EN.md) 

这是一个基于 Cloudflare Worker / Vercel 的 Telegram 双向私聊机器人，无需服务器、无需数据库、无需自己的域名即可轻松部署。

用户可以通过您的机器人向您发送消息，您可以直接回复这些消息，实现双向通信。

## ✨ 特色功能

- 🔄 **双向通信** - 轻松接收和回复来自用户的消息
- 💾 **无需数据库** - 应用无需 D1、KV 或其他存储，验证凭证保存在 Telegram 置顶消息中
- 🛡️ **基础反垃圾验证** - 用户通过随机表情按钮题后才转发消息
- 🌐 **无需自己的域名** - 使用 Cloudflare Worker 提供的免费域名
- 🚀 **轻量级部署** - 几分钟内即可完成设置
- 💰 **零成本运行** - 在 Cloudflare 免费计划范围内使用
- 🔒 **安全可靠** - 使用 Telegram 官方 API 和安全令牌
- 🔌 **多机器人支持** - 一个部署可注册多个私聊机器人
- 🛠️ **多种部署方式** - 支持 GitHub 一键部署、Vercel 一键部署、Wrangler CLI 和 Dashboard 部署

## 🛠️ 前置要求

- Cloudflare 账号
- Telegram 账号
- 一个科学工具（仅设置阶段需要，用于访问 Worker 默认域名，自绑域名无视）

## 📝 设置步骤

### 1. 获取 Telegram UID

> [!NOTE]
> 您需要知道自己的 Telegram 用户 ID (UID)，这是一串数字，用于将消息转发给您。

您可以通过以下方式获取：

- 向 [@userinfobot](https://t.me/userinfobot) 发送任意消息，它会告诉您自己的 UID

请记下您的数字 ID（例如：`123456789`）。

### 2. 创建 Telegram Bot

1. 在 Telegram 中搜索并打开 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 命令
3. 按照提示设置您的机器人名称和用户名（用户名必须以 `bot` 结尾）
4. 成功后，BotFather 会发给您一个 Bot API Token（格式类似：`000000000:ABCDEFGhijklmnopqrstuvwxyz`）
5. 请安全保存这个 Bot API Token

### 3. 选择部署方式

#### 方法一：GitHub 一键部署（推荐 ⭐）

这是最简单的部署方式，无需本地开发环境，直接通过 GitHub 仓库部署。

1. Fork 或克隆本仓库到您的 GitHub 账户
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 导航到 **Workers & Pages** 部分
4. 点击 **Create Application**
5. 选择 **Connect to Git**
6. 授权 Cloudflare 访问您的 GitHub，并选择您 fork 的仓库
7. 配置部署设置：
   - **Project name**：设置您的项目名称（例如 `open-wegram-bot`）
   - **Production branch**：选择主分支（通常是 `master`）
   - 其他设置保持默认
8. 配置环境变量：
   - 点击 **Environment Variables**
   - 添加 `PREFIX`（例如：`public`）
   - 添加 `SECRET_TOKEN`（必须包含大小写字母和数字，长度至少16位），并标记为**加密**
9. 点击 **Save and Deploy** 按钮完成部署

这种方式的优点是：当您更新 GitHub 仓库时，Cloudflare 会自动重新部署您的 Worker。

#### 方法二：Vercel 一键部署

Vercel 提供了另一种简单的部署方式，也支持从 GitHub 仓库自动部署。

1. 点击下方的"Deploy with Vercel"按钮：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwozulong%2Fopen-wegram-bot&env=SECRET_TOKEN,PREFIX&envDescription=配置您的机器人参数&project-name=open-wegram-bot&repository-name=open-wegram-bot)

2. 按照 Vercel 的提示完成部署流程
3. 配置环境变量：
   - `PREFIX`：设置为您想要的 URL 前缀（例如 `public`）
   - `SECRET_TOKEN`：设置一个安全的令牌（必须包含大小写字母和数字，长度至少16位）
4. 完成部署后，Vercel 会提供一个域名，如 `your-project.vercel.app`

Vercel 部署的优点是简单快速，支持自动更新，并且默认提供 HTTPS。

#### 方法三：使用 Wrangler CLI

如果您熟悉命令行工具，可以使用 Wrangler CLI 进行部署。

1. 确保安装了 Node.js 和 npm
2. 克隆本仓库：
   ```bash
   git clone https://github.com/wozulong/open-wegram-bot.git
   cd open-wegram-bot
   ```
3. 安装依赖：
   ```bash
   npm install
   ```
4. 部署 Worker：
   ```bash
   npx wrangler deploy
   ```
5. 设置您的安全令牌：
   ```bash
   npx wrangler secret put SECRET_TOKEN
   ```

#### 方法四：通过 Cloudflare Dashboard 手动部署

如果您不想使用 GitHub 或命令行，也可以直接在 Cloudflare Dashboard 中创建。

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 导航到 **Workers & Pages** 页面
3. 点击 **Create Worker**
4. 在默认入口文件中粘贴 `src/worker.js` 的代码；在同一目录新建 `core.js` 和 `verification.js`，分别粘贴 `src/core.js` 和 `src/verification.js` 的代码，保留相对 import
5. 点击 **Save and Deploy**
6. 在 Worker 设置中添加环境变量：
   - `PREFIX`（例如：`public`）
   - `SECRET_TOKEN`（必须包含大小写字母和数字，长度至少16位）

#### 方法五：Deno 一键部署

Deno 提供了另一种简单的部署方式，也支持从 GitHub 仓库自动部署。

1. Fork 本仓库到您的 GitHub 账户
2. 登录 [Deno Deploy](https://dash.deno.com) 并点击 **New Project**
3. 选择已授权的 GitHub 账户并选择您的 Fork 仓库
4. 在 **Project Configuration** -> **Entrypoint** 下选择 `deno/server.js`
5. 点击 **Deploy Project** 按钮，等待部署完成
6. 点击页面底部 **Add environment variables** 按钮，添加环境变量：
   - `PREFIX`：URL前缀，例如 `public`
   - `SECRET_TOKEN`：加密令牌，必须包含大小写字母和数字，长度至少16位
7. 点击 **Save (2 new)** 按钮保存环境变量后即完成部署，环境变量上方即为 Deno 提供的域名，如 `project-name.deno.dev`

#### 方法六：Netlify 一键部署

Netlify 提供了另一种简单的部署方式，也支持从 GitHub 仓库自动部署。

1. Fork 本仓库到您的 GitHub 账户
2. 登录 [Netlify](https://app.netlify.com/) 并点击 **Add new site** -> **Add new site
Import an existing project**
3. 选择已授权的 GitHub 账户并选择您的 Fork 仓库
4. 填写 **Site name** 并添加环境变量：
   - 点击 **Add environment variables** -> **Add key/value pairs**
   - `NETLIFY_PREFIX`：URL前缀，例如 `public`
   - `SECRET_TOKEN`：加密令牌，必须包含大小写字母和数字，长度至少16位
5. 点击 **Deploy xxx** 按钮，部署完成后即可在站点名称下看到 Netlify 提供的域名，如 `site-name.netlify.app`

#### 方法七：EdgeOne 一键部署

EdgeOne 提供了另一种简单的部署方式，也支持从 GitHub 仓库自动部署。

1. Fork 本仓库到您的 GitHub 账户
2. 登录 [EdgeOne Pages](https://edgeone.ai/login?s_url=https://console.tencentcloud.com/edgeone/pages) 并点击 **创建项目** -> **导入 Git 仓库**
3. 选择已授权的 GitHub 账户并选择您的 Fork 仓库
4. 添加环境变量：
   - `EDGEONE_PREFIX`：URL前缀，例如 `public`
   - `SECRET_TOKEN`：加密令牌，必须包含大小写字母和数字，长度至少16位
5. 点击 **开始部署** 按钮，部署完成后转到 **项目设置** -> **域名管理** 添加自定义域名，默认域名 `project-name.edgeone.app` 只支持预览，有效期仅 3 个小时！

### 3.1 (可选) 绑定自定义域名 🌐

> [!TIP]
> 为您的 Worker 绑定自定义域名可以避免使用科学工具访问，更加便捷！

Cloudflare 允许您将自己的域名绑定到 Worker 上，这样您就可以通过自己的域名访问 Worker，而不需要使用被和谐的默认域名。

1. 在 Cloudflare 仪表板中添加您的域名
2. 在 Workers & Pages 部分，选择您的 worker
3. 点击 **Triggers**，然后点击 **Add Custom Domain**
4. 按照说明将您的域名绑定到 Worker

绑定后，您可以使用类似 `https://your-domain.com/YOUR_PREFIX/install/...` 的地址来注册/卸载机器人，无需科学工具。

### 4. 注册您的 Telegram Bot

部署 Worker 后，您将获得一个 URL，形如：
- GitHub 集成：`https://your-project-name.username.workers.dev`
- Vercel 部署：`https://your-project.vercel.app`
- Wrangler/Dashboard：`https://your-worker-name.your-subdomain.workers.dev`
- Deno 部署：`https://project-name.deno.dev`
- Netlify 部署：`https://site-name.netlify.app`
- EdgeOne 部署：`https://your.custom.domain`

现在您需要注册您的 Bot：

> [!WARNING]
> 由于 Cloudflare Workers 默认域名被和谐，此步骤需要科学。如果您已绑定自定义域名，可以直接使用您的域名进行访问，无需科学工具。

1. 在浏览器中访问以下 URL 来注册您的 Bot（替换相应参数）：

```
https://your-worker-url/YOUR_PREFIX/install/YOUR_TELEGRAM_UID/BOT_API_TOKEN
```

例如：
```
https://open-wegram-bot.username.workers.dev/public/install/123456789/000000000:ABCDEFGhijklmnopqrstuvwxyz
```

2. 如果看到成功消息，说明您的 Bot 已经注册成功

> [!NOTE]
> 一个 Worker 实例可以注册多个不同的 Bot！只需重复上述注册步骤，使用不同的 Bot API Token 即可。

## 📱 使用方法

### 无数据库验证

首次发送消息或 `/start` 时，用户需要按提示点击正确的表情按钮。
通过后，bot 会在该用户的私聊里置顶一条 HMAC 签名凭证，有效期约 30 天。
后续通过 Telegram `getChat` 读取置顶凭证，检查签名、用户、bot、收件人和有效期。
应用不使用 D1、KV、Redis、进程内验证缓存或外部数据库；验证状态由 Telegram 保存。
所有部署入口共用 `src/core.js`，默认启用验证，无需新增环境变量。

**升级后必须重新注册 webhook**，以订阅新增的 `callback_query` 更新；沿用原安装地址即可。
手动部署时还需包含 `src/verification.js`。已有用户也会首次验证。
验证前发送的消息直接丢弃，不转发、不暂存；验证完成后需要重新发送。
无需邀请用户进群，收件和回复仍然在原来的私聊中进行。

边界：

- 这是拦截简单批量投广告脚本的基础门槛，读题脚本或遍历按钮可以绕过，不能替代 Turnstile/reCAPTCHA。
- 不提供持久黑名单、尝试次数限制、严格限流或跨请求去重；通过验证的账号仍然可能发广告。
- 凭证被取消置顶、删除、自动删除，或更新的其他消息被置顶后，需要重新验证；不会清除其他置顶消息。
- 更改 bot token、收件人或 `SECRET_TOKEN` 后旧凭证失效；重新注册并验证即可。
- 每条用户消息多一次 `getChat` 调用。Telegram API 失败时不会放行未验证消息，会返回 500 请求 webhook 重试。
- 普通转发仍沿用原项目的 webhook 重试语义，极端情况下可能出现重复消息。

开发验证：`npm test`。测试使用模拟 Telegram API；上线前请用真实 bot 检查私聊置顶、重启后验证、取消置顶和回复路径。

### 接收消息 📩

一旦设置完成，用户通过基础验证后重新发送的消息会转发到您的 Telegram 账号，并且消息下方会显示发送者的信息。

### 回复消息 📤

要回复某个用户的消息：
1. 在 Telegram 中找到您想回复的转发消息
2. 直接回复该消息（使用 Telegram 的回复功能）
3. 您的回复会被自动发送给原始发送者

### 卸载 Bot ❌

如果您想卸载 Bot，请访问以下 URL（替换相应参数）：

```
https://your-worker-url/YOUR_PREFIX/uninstall/BOT_API_TOKEN
```

## 🔒 安全说明

> [!IMPORTANT]
> 请妥善保管您的 Bot API Token 和安全令牌（Secret Token），这些信息关系到您服务的安全性。

> [!WARNING]
> **请勿随意更改已设置的 Secret Token！** 更改后，所有已注册的机器人将无法正常工作，因为无法匹配原来的令牌。如需更改，所有机器人都需要重新注册。

- 在初始设置时选择一个安全且便于记忆的 Secret Token
- 避免使用简单或常见的前缀名称
- 不要将敏感信息分享给他人

## ⚠️ 使用限制

> [!NOTE]
> Cloudflare Worker 免费套餐有每日 10 万请求的限制。

对于个人使用的私聊机器人来说，这个限制通常足够宽松。即使您注册了多个机器人，除非您的机器人极其活跃，否则不太可能达到这个限制。

如果您预计使用量较大，可以考虑升级到 Cloudflare 的付费计划。

## 🔍 故障排除

- **消息未转发**: 确保 Bot 已正确注册，并检查 Worker 日志
- **无法访问注册 URL**: 确认您是否相信科学，或者考虑绑定自定义域名解决访问问题
- **回复消息失败**: 检查您是否正确使用 Telegram 的回复功能
- **注册失败**: 确保您的 `SECRET_TOKEN` 符合要求（包含大小写字母和数字，长度至少16位）
- **GitHub 部署失败**: 检查环境变量是否正确设置，仓库权限是否正确
- **Worker 部署失败**: 检查 Wrangler 配置并确保您已登录到 Cloudflare

## 🤝 贡献与联系

如果您有任何问题、建议或想贡献代码，请提 Issue/PR 或通过以下方式联系我：

- [LINUX DO](https://linux.do)

## 📄 许可证

- GPL v3，希望你能完善并继续开源，而不是改头换面闭源，谢谢。

---

希望这个工具能让您的 Telegram 私聊体验更加便捷！🎉 如果你只想直接使用，请访问 [@WegramBot](https://t.me/wegram_bot)
