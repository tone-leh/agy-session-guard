# agy-Sag

[English](./README.md)

**面向 Google Antigravity 2.0 的模块化深度增强套件** *(原名 `agy-session-guard`)*

内置 **10 国语言原生界面实时翻译**（每语种约 5,400 词条）、**统一 6-Tab 控制中心与 `Ctrl/Cmd+Alt+,` 全局设置抽屉**、**分段式状态胶囊 HUD**、**`Ctrl/Cmd+Alt+P` 提示词库与命令面板**、自定义阈值静默 `/compact` 防爆与视口滚动盾、流式运行中 **提示词排队**、防丢 **草稿保护**、轮次书签与跨会话档案库、带不可绕过高危黑名单的 **安全自动审批**、零 `:has()` **光学主题与中文字体排版**、零封号风险的 **只读配额脉冲**，以及离线 **本地存储体检与脱敏备份 CLI**——**全部模块独立开关，按需启用**。

> **当前版本：** `v1.5.1` · **开源协议：** [MIT](./LICENSE) · **运行环境：** Node.js >= 22 · **外部依赖：** 零 npm 运行依赖 · **架构路线：** Zero-ASAR 无损 CDP · **双星搭档：** [`agy-NOV`](https://github.com/tone-leh/agy-NOV)

> **非官方社区项目与商标免责声明：** `agy-Sag` 为独立的开源社区项目，与 Google LLC 无任何隶属、赞助或官方背书关系；文中提及的 “Antigravity” 与 “Google” 仅作软件兼容性说明用途。

---

## 双星组合：推荐同时安装 `agy-NOV` + `agy-Sag`（零重叠深度协同）

我们为 Google Antigravity 2.0 并行维护两款**定位清晰、功能零重叠、天然互补**的开源插件，把「纯原生安全合规」与「深入界面及对话流增强」分成两条清晰轨道，推荐同时安装：

| 对比维度 | [`agy-NOV`](https://github.com/tone-leh/agy-NOV) · 纯原生工程工作台 | **`agy-Sag`**（本项目）· 界面与对话驾驶舱 |
| :--- | :--- | :--- |
| **技术路线** | 100% 官方原生 MCP Apps (SEP-1865) + Lifecycle Hooks，**零 ASAR、零 CDP** | Zero-ASAR Electron CDP 渲染层引擎 + Watch Sidecar + 离线存储体检 CLI |
| **升级与安全特性** | 严格走官方插件协议，客户端任意升级稳定生效 | 零改动 `app.asar` 与 Apple 公证签名，Watch 守护进程自动重挂，卸载 0 残留 |
| **主攻场景** | 侧边栏/全局工程工作台、改前安全拦截与快照、Stop 校验门、工作树与 Spec 写锁、长期记忆与远程遥控 | 统一 6-Tab 控制中心与全局抽屉、底栏分段 HUD、10 国界面多语言、提示词命令面板与排队、外观排版与本地数据治理 |
| **核心模块矩阵** | **13 大零 CDP 纯原生模块**，分 5 大分类（5 档预设，6–47 工具）：`review`、`guard`、`xray`、`turbo`、`radar`、`verify`、`worktree`、`spec`、`studio`、`canvas`、`mem`、`ops`、`remote` | **14 大渲染模块 + 离线存储 CLI**（4 档预设）：`hostI18n`、`thoughtTranslate`（按需开启）、`themeStudio`、`readingNav`、`compactGuard`、`precompactExport`、`draftGuard`、`promptQueue`、`promptLibrary`、`outlineBookmarks`、`sessionWatchdog`、`sessionRadar`、`safeAutoAccept`、`quotaPulse`、`storage-doctor` |

### 双星联动化学反应（零额外网络端口）

同时安装 **`agy-Sag`** 与 **`agy-NOV`** 后，`agy-Sag` 统一控制中心（内嵌于 **Settings → Appearance** 或通过 `Ctrl/Cmd+Alt+,` 打开右侧抽屉）自动解锁 **`双星 NOV`** 面板，并与 `agy-NOV` 保持统一视觉设计 Token（`--sag-*` 对齐 `--nov-*`）：

- **在 Antigravity 原生设置里直接热控 `agy-NOV`（`v0.5–v1.2+`）**：按 5 大分类一键开关全部 **13 个 `agy-NOV` 纯原生模块**、切换 **5 档场景预设**（`minimal` 6 / `core` 12 / `power` 32 / `local-all` 43 / `full` 47 工具），并在切换界面语言时自动同步 8 语种交集。通信复用 CDP `Runtime.addBinding`（零额外 HTTP 端口）通知 Sidecar 原子更新 `agy-NOV` 的 `config.json`（`0600`），`agy-NOV` 服务端通过原生文件签名热同步刷新 `tools/list`，全程保持 `agy-NOV` 零 CDP 纯净。
- **提示词库只读消费 `agy-NOV` 工程模板（`promptLibrary` × `agy-NOV ops`）**：通过零端口 `sag:nov_templates` 只读通道读取 `agy-NOV` 的 `ops/prompts.json`（严格 symlink 拒止、`<= 256 KB` 上限、零磁盘写入），并在 `Ctrl/Cmd+Alt+P` 命令面板自动透出 5 条原生 Playbook（`/nov-spec`、`/nov-debug`、`/nov-review`、`/nov-handoff`、`/nov-workflow`）。
- **双星只读数据流与按轮回滚联动（`sag:nov_feed` × `guard` / `verify` / `spec` / `mem` / `radar` / `xray`）**：通过零端口只读通道聚合 `agy-NOV` 快照（兼容 `feed-snapshot.json` 嵌套 `summary` 与 `health-sweep.json`，单文件 `<= 256 KB`、symlink 拒止、零写入）：`spec` 写锁激活时自动暂停 `promptQueue` 出队，底栏 HUD 与 `双星 NOV` 面板实时展示 `NOV 🔒` / `NOV ⛔`（Verify 阻断）/ `NOV · ΔN` 记忆漂移、健康分与 Guard 拦截数，并在每轮消息栏提供按需 `↺` 回滚提示词填充按钮（仅 `agy-NOV guard` 开启时可见，安全追加不覆盖草稿）。
- **多层安全护盾协同（`safeAutoAccept` × `agy-NOV guard` / `verify`）**：前端铁壁黑名单自动审批与后端 PreToolUse 密钥防火墙、改前文件快照及 Stop 实测校验门形成多层防护。
- **压缩护航 × 记忆与透视（`compactGuard` × `agy-NOV mem` / `xray`）**：上下文自动压缩与代码锚定长期记忆、Token 透视形成闭环。
- **通知防重礼让（`sessionRadar` × `agy-NOV radar`）**：自动识别双侧提醒同时开启并提供一键去重。

> **一步装齐双星组合：**
> ```bash
> # 1) 13 模块纯原生协议工程工作台（100% 零 ASAR、零 CDP、升级不失效）
> agy plugin install https://github.com/tone-leh/agy-NOV
>
> # 2) 统一控制中心、状态 HUD、10 国界面多语言与深度对话套件（Zero-ASAR CDP）
> agy plugin install https://github.com/tone-leh/agy-Sag
> ```

---

## 统一控制中心与分段状态胶囊 HUD

- **单一真源 6-Tab 控制中心（`概览 | 界面 | 对话 | 守护 | 双星 NOV | 高级`）**：支持从原生 **Settings → Appearance**（左侧导航栏自动注入 `agy-Sag` 快捷锚点）、全局快捷键 **`Ctrl/Cmd+Alt+,`**（`420px` 右侧滑出抽屉，`Esc` 关闭）或状态卡底部「完整设置 →」直达。全部 14 个模块总开关集中在 `概览` 页（杜绝重复开关），低频项收纳在 `<details>` 折叠区，顶部搜索框跨全 Tab 即时过滤，`高级` 页提供配置 JSON 导出/校验导入、内联二次确认重置（零 `window.confirm`）、运行态诊断与零写入 **本地存储体检**（`sag:storage_audit`）；按 **`Ctrl/Cmd+Shift+Alt+/`** 随时呼出当前生效快捷键速查浮层（避让 Antigravity v2.36.0 原生 `Option+Cmd+/` 快捷键列表）。
- **统一分段式状态胶囊 HUD 与上下文透镜**：输入框底栏以单枚紧凑胶囊汇总实时指标，各分段严格跟随对应模块开关增删（`ctx` 12px 圆环、`eta` 剩余轮数或 `m:ss` 停滞、`quota`、`queue`、`bookmarks`、`autoAccept`、`NOV`）。展开浮卡呈现纯本地 **三色上下文构成条**（提问 / 正文 / 代码与工具）、**Top-3 最重轮次跳转**、上一轮流式耗时、5h 配额进度条与一键「导出 MD」。检测到 Obsidian Prism 上下文卡片时自动无痕内嵌其 Shadow DOM，底栏零多余胶囊。

---

## 14 大独立开关渲染模块 + 离线存储体检（按需开关）

所有模块均可在 `概览` 页或命令行单独开关。关闭的模块零 DOM 观察器、零事件监听、零定时器开销。

| 层级 | 模块 | 默认状态 | 隔离与风险分级 | 核心能力 |
| :---: | :--- | :---: | :--- | :--- |
| **L1** | **原生界面翻译**（`hostI18n`） | **开启** | 100% 离线 · 无损热切 | 实时翻译 Antigravity 2.36+ 原生桌面界面，内置 **10 国语言**（简中、繁中、日、韩、西、法、德、俄、葡、英文还原）。每语种覆盖约 5,464–5,580 词条（534 核心 + 分层扩展词库 + 444 正则模板，覆盖复合步骤行与 Swarm 词条），支持 6 种属性翻译、快捷键/标点后缀拼装、5ms + 600 节点双预算分片、元素级 React 冲突熔断、物理豁免（代码块/CLI 命令/对话正文/KaTeX 与 MathJax 公式/斜杠命令）、穿透 Shadow DOM 与自定义 JSON 词典导入。 |
| **L1** | **思考与标题翻译**（`thoughtTranslate`） | 关闭 | **高敏默认关** · Sidecar 代理 | 实时翻译 Agent 思考块与可选侧栏/面包屑标题。支持 **5 类引擎**：免 Key 双路容灾机翻（Google GTX + Bing 自动切换与反引号代码保护）、用户自填 API Key **OpenAI 兼容多 Profile**（OpenAI / Gemini / DeepSeek / OpenRouter / Groq / LM Studio）、**Anthropic**、**Gemini** 与本机离线 **Ollama**。内置 `0600` 磁盘持久缓存（600 条重启不重翻）、macOS/环境系统代理 HTTP CONNECT 穿透、9 语种工程手稿 Prompt（`technical`/`concise`）与推理模型降思考、48k 超长分段、零端口 SSE 流式增量渲染、20 条标题批量打包、目标语自动跳过与 Prism 礼让。 |
| **L1** | **光学主题与美学皮肤**（`themeStudio`） | 关闭 | 100% 离线 | 零 `:has()` 全表面视觉与动效引擎：内置 **15 套精选深浅与风格皮肤**、**8 套一键外观方案**、跟随宿主明暗自动配对、右侧 **Auxiliary Pane**（子代理/后台任务/变更文件/终端面板）视觉融合、7 档强调色覆写、4 档表面材质（含黑曜切面/纸墨手帐/极光玻璃）、4 档全局圆角、6 档代码字体栈（含更纱黑体）与连字、CJK 调优、`CSS.highlights` 五级水墨流式淡入、FastDOM 丝滑输入光标、0fps 底缘语义微光（避让 Browser Hole）、净化自定义 CSS，以及向 `plugin://` 扩展面板（含 `agy-NOV`）同步主题变量。 |
| **L1** | **阅读导航**（`readingNav`） | 关闭 | 100% 离线 | 流式保护的长代码块折叠（默认 `>= 40` 行，支持 `20/40/60/80`，同时覆盖对话区、`artifact-view`、`auxiliary-pane` 与 `terminal-panel`），收起自动 `scrollTop` 补偿、吸顶行数/展开/换行/复制条、`Alt+↑/↓` 跳轮、无上限可滚动迷你导轨与一键顺滑滚底（`⤓`）、`Alt+F` 本会话大纲实时搜索、一键折展全部代码与步骤，以及零 `innerHTML` Mermaid 缩放与 SVG 导出模态（遇 Prism 自动礼让）。 |
| **L2** | **自动压缩保护**（`compactGuard`） | **开启** | 100% 离线 | 自定义预警与触发阈值（`关闭` 或 `50%–98%`，默认 `80%`），默认静默自动压缩并启用视口滚动盾（阅读历史消息时不跳屏）；兼容 Lexical 两步斜杠选择、`/clear` 轻量重开与压缩后锚点续接条。 |
| **L2** | **压缩前导出**（`precompactExport`） | **开启** | 100% 离线 | 内嵌于 `compactGuard` 卡片下的子开关：压缩前一键复制或下载 `.md` 复盘档案，自动脱敏 PEM 私钥、API Key、Bearer Token 与 JWT，支持去噪结论版精简导出。 |
| **L2** | **草稿防丢**（`draftGuard`） | **开启** | 100% 离线 | 按会话自动防抖暂存未发送草稿（7 天有效期、16 KB 上限）单行恢复，自动记录输入区图片/文件附件数量并在恢复条提醒重新粘贴；同步维护最近 30 条脱敏已发提示词历史，空输入框按 `Ctrl+↑/↓` 随时召回微调。 |
| **L2** | **提示词排队**（`promptQueue`） | **开启** | 100% 离线 | Agent 流式执行长任务时预先排队 1–20 条后续指令，支持行内双击/按钮编辑与一键置顶插队（`⏫`）；回合空闲后自动发送，内置**五重安全熔断**（流式中、输入框有草稿、待审批卡片、`agy-NOV spec` 写锁或原生 `Send Now` 队列生效时绝不盲发）。 |
| **L2** | **提示词库**（`promptLibrary`） | 关闭 | 100% 离线 · 只读 NOV | 输入区按钮、`Ctrl/Cmd+Alt+P` 命令面板与空框 `//` 速唤：斜杠指令、6 套双语 `{{变量=默认值}}` 模板、自定义片段增删改与 128 KB 导入导出、只读 `agy-NOV ops` 模板与 5 条原生 Playbook（连接 NOV 时自动透出 `/nov-spec`、`/nov-debug`、`/nov-review`、`/nov-handoff`、`/nov-workflow`）、对话选区浮动引用胶囊，以及遇 Prism 自动礼让的独立对话/路径右键菜单（含 `/btw` 侧边快问、`/plan`、`/compact`、引用模板与跨平台 POSIX/Windows `@路径` 插入）；安全追加绝不自动发送。 |
| **L2** | **轮次书签与档案库**（`outlineBookmarks`） | 关闭 | 100% 离线 · 只读检索 | 消息操作栏收藏星标、每轮 `⤺` 三选一恢复微菜单（NOV 文件回滚 / `/compact` 聚焦 / 复制截至此轮交接稿）、悬浮 `★ N` 快速回跳抽屉，以及 `Ctrl/Cmd+Shift+B` 档案库（支持切换 `★ 书签` 与零端口只读 `🔍 全部会话` 脱敏历史检索）。 |
| **L3** | **卡死与燃尽监测**（`sessionWatchdog`） | **开启** | 100% 离线 | 估算到达阈值的剩余轮数（展示于状态胶囊 HUD）、标记单轮突增，并在流式输出长时间静默（默认 3 分钟）时轻提醒并支持一键 `+5m` 延后。 |
| **L3** | **侧栏聚光与提醒**（`sessionRadar`） | 关闭 | 100% 离线 | 左侧会话列表顶部增加 `全部 / 运行中 / 待确认` 快捷筛选，支持窗口切后台时的桌面通知、零外发 WebAudio 合成提示音、浏览器本地语音播报（TTS）与 `HH:MM-HH:MM` 静音时段。 |
| **L3** | **安全自动审批**（`safeAutoAccept`） | 关闭 | **高敏默认关** · 本地 | 针对低风险内联审批卡片按策略自动放行（`readonly-safe` 只读安全 / `dev-flow` 研发闭环 / `custom` 自定义），内置**任何模式下均不可绕过的铁壁黑名单**（拦截 `rm -rf`、`git push --force`、`reset --hard`、`DROP TABLE`、`curl\|sh`、`sudo`、`.env`、`~/.ssh` 及 Windows PowerShell/CMD 破坏性命令），支持演练 Dry-Run、一键急停与 50 条审计日志。 |
| **L3** | **配额脉冲**（`quotaPulse`） | 关闭 | 100% 离线 · 纯只读 | 零凭据接触、零网络请求的只读额度观测器：记录本地 5 小时与 7 天活动估算，并捕获页面中出现的 429 / 限流 / `Resets in ...` 倒计时提示，严格区分页面实测与本地估算，杜绝号池封号风险。 |
| **CLI** | **本地存储体检**（`storage-doctor`） | CLI | 只读审计 | 独立命令行工具（`agy-sag storage audit\|backup\|export\|search`），扫描 `~/.gemini/antigravity/` 空间占用、孤儿目录、SQLite `.db-wal` 活跃写锁状态，支持只读脱敏跨会话关键词检索与 Markdown/JSON 导出及安全备份。 |

### 4 档一键场景预设

在设置面板或 CLI（`--preset=<档位>`）随时一键切换：

- **`essential`（默认推荐）**：`hostI18n` + `compactGuard` + `precompactExport` + `draftGuard` + `promptQueue` + `sessionWatchdog`
- **`i18n-only`（仅多语言）**：仅开启 `hostI18n`，其余增强全部关闭，零打扰体验原生界面多语言
- **`power`（极客全能）**：`essential` + `readingNav` + `promptLibrary` + `outlineBookmarks` + `themeStudio` + `quotaPulse`
- **`full-auto`（全开自动）**：开启全部 13 个模块（`safeAutoAccept` 默认锁定最保守的 `readonly-safe` 档位）

---

## 原生界面多语言翻译引擎（`hostI18n`）详解

Google Antigravity 2.x 将前端界面内嵌在已签名的 Go 二进制 `language_server` 中，未提供内置多语言切换。**`agy-Sag`** 通过 Zero-ASAR CDP 在渲染进程实现无损、实时、全覆盖的多语言界面翻译：

- **开箱支持 10 种语言**：`zh-CN`（简体中文）、`zh-TW`（繁體中文）、`ja`（日本語）、`ko`（한국어）、`es`（Español）、`fr`（Français）、`de`（Deutsch）、`ru`（Русский）、`pt-BR`（Português）及 `en`（原版英文一键还原）。
- **物理级内容隔离红线**：严格跳过 `<code>`、`<pre>`、Monaco 编辑器、`.xterm` 终端、Lexical 输入框、用户/助手对话消息气泡、Git 分支与工作区名称，以及 `/compact`、`/clear` 等斜杠命令名本身（仅翻译命令右侧的说明文字）。
- **毫秒级热切与 100% 无损还原**：通过 `WeakMap` 保存每个 TextNode 与白名单属性（`placeholder`、`title`、`aria-label`）的英文原文，配合 8,000 条有界 FIFO 缓存防内存增长；切换为 `English (原版)` 或卸载插件时瞬间还原全部节点。
- **第三方翻译器防撞机制**：自动检测 Obsidian Prism 宿主翻译器（`html[data-ag-prism-host-i18n="active"]`），默认自动礼让避免双翻译器冲突，也可在设置里一键切为「主动接管」。
- **三层扩展词典（每语种约 5,400 词条）**：按 `用户自定义词典 > 内置 465 核心词条 > 扩展词库` 优先级合并。`packages/core/locales/ext/*.json` 基于 MIT 上游 [`yiheng8023/antigravity-chinese`](https://github.com/yiheng8023/antigravity-chinese) 与多语种重译构建，支持单语种 CDP 预注入（总包 `<= 1.6 MB`）、`sag:ext_pack` 零端口 Watch 桥按需拉取，以及离线 Workbench `/ext/<loc>.json` 只读路由；另可用 `collectMissing` 采集新增英文界面词条并通过 `npm run i18n:validate` 校验。详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

---

## 快速上手

### 1. 作为 Antigravity 插件安装（推荐）

```bash
agy plugin install https://github.com/tone-leh/agy-Sag
```

或从本地源码安装到插件目录：

```bash
git clone https://github.com/tone-leh/agy-Sag.git
cd agy-Sag
npm run install:plugin
```

> **CDP 前置说明**：Zero-ASAR 附着仅连接本机已开启的 `DevToolsActivePort`。可使用跨平台启动器 `node cli/sag-cli.mjs launch --port=9222`（自动礼让 Obsidian Prism、绝不强杀已有进程，支持 `--dry-run --json`），或手动使用 `open -a Antigravity --args --remote-debugging-port=9222`。`agy-Sag` 绝不修改 `app.asar`。

### 2. 离线沙盒零侵入预览（完全不碰日常客户端）

```bash
git clone https://github.com/tone-leh/agy-Sag.git
cd agy-Sag
npm run workbench
```

浏览器打开 `http://127.0.0.1:4179`，即可在内置模拟器中现场体验：6-Tab 控制中心、`Ctrl/Cmd+Alt+,` 全局抽屉、底栏分段 HUD、`Ctrl/Cmd+Alt+P` 提示词库与变量填表、10 国语言原生界面实时热切、4 档场景预设、提示词队列出队、安全自动审批、15 套光学主题与 8 套一键外观方案、只读配额限流与 `agy-NOV` 双向联动。

### 3. 统一命令行（CLI）速查

```bash
# 只读预览跨平台 CDP 启动计划（默认礼让 Obsidian Prism，不启停任何进程）
node cli/sag-cli.mjs launch --dry-run --json

# 跨平台带调试端口启动与保活循环（keepalive 自动贯通启动端口；支持 ANTIGRAVITY_BIN 与 <=5s 冷启动优雅重开）
node cli/sag-cli.mjs launch --port=9222
node cli/sag-cli.mjs keepalive --preset=power --lang=zh-CN

# 只读脱敏预览或应用 Obsidian Prism 配置平滑迁移（默认零写入，绝不改动 Prism 原文件）
node cli/sag-cli.mjs migrate-from-prism --dry-run

# 输出 macOS LaunchAgent 无感保活 plist 模板（零手写配置）
node cli/sag-cli.mjs launch --print-launchagent

# 一次性附着，并指定场景预设与目标语言（固定端口启动时可加 --port=9222）
node cli/sag-cli.mjs attach --preset=power --lang=zh-CN

# 启动自适应退避 Watch 守护进程（窗口新建或 Cmd+R 重载后自动补挂）
node cli/sag-cli.mjs watch --preset=essential --lang=ja

# 100% 只读环境体检（检查 Node、CDP、Obsidian Prism 与 agy-NOV 双星协同）
node cli/sag-cli.mjs doctor

# 校验与查看全部 10 国内置 + 9 扩展界面翻译词典统计
node cli/sag-cli.mjs i18n validate
node cli/sag-cli.mjs i18n list

# 本地存储体检、WAL 写锁检测、脱敏跨会话检索、安全备份与会话导出
node cli/sag-cli.mjs storage audit
node cli/sag-cli.mjs storage search --q="Auxiliary Pane" --limit=10
node cli/sag-cli.mjs storage backup --out=/tmp/agy-backup --dry-run
node cli/sag-cli.mjs storage export --session=<SESSION_ID> --format=md

# 直接通过 agy-Sag 命令行查看或切换双星搭档 agy-NOV v0.5 的 13 个模块与预设
node cli/sag-cli.mjs nov status
node cli/sag-cli.mjs nov preset power
node cli/sag-cli.mjs nov enable verify

# 从活跃窗口 100% 无损卸载所有 DOM、样式与全局对象
node cli/sag-cli.mjs remove
```

---

## 架构与安全边界

```text
Antigravity 2.0 宿主（Electron 44 + language_server 本地渲染界面）
 ├── Sidecar / CLI 层（Node.js >= 22，零 npm 运行依赖）
 │    ├── cli/sag-cli.mjs        — 统一命令入口（launch / keepalive / attach / watch / doctor / i18n / storage / nov / workbench）
 │    ├── cli/platform-utils.mjs — 跨平台入口软链校验、Windows/Linux 路径边界归一与原子替换重试
 │    ├── cli/launcher.mjs       — 跨平台 CDP 启动与保活（Win PowerShell UTF-8/pwsh/Scoop、Linux XDG/Flatpak/Snap//proc、Prism 礼让与 0600 原子状态）
 │    ├── cli/watch-daemon.mjs   — 自适应退避（3s -> 30s）CDP 守护进程、实时 nov:feed 推送与零端口桥（sag:ext_pack / sag:nov_* / sag:storage_audit / sag:translate_*）
 │    ├── cli/translator-service.mjs — 严格按需开启的 5 引擎思考与标题翻译代理（MT / OpenAI / Anthropic / Gemini / Ollama），0600 密钥隔离与 SSRF 防护
 │    ├── cli/nov-bridge.mjs     — 0600 原子化 agy-NOV 配置桥（13 模块 / 5 预设）+ 只读脱敏模板与实时数据流读取器
 │    ├── cli/bundle.mjs         — 零构建 UMD 拼接器（SHA-256 幂等附着、<=1.6MB 扩展包预注入与一键全清）
 │    └── cli/storage-doctor.mjs — 只读存储诊断、WAL 活跃锁防护与密钥脱敏导出
 └── 渲染层模块化 UMD 核心（packages/core/，全部支持 100% 无损 destroy()）
      ├── coexist.js             — 配置校验、4 档预设、14 模块目录、宿主礼让与失焦休眠
      ├── host-i18n*.js          — 10 国语言 WeakMap DOM 翻译引擎 + 465 核心 + ~5k 分层扩展词库（locales/ext/）
      ├── thought-translator.js  — 严格默认关闭的思考与侧栏标题实时翻译（双语/纯译文、Prism 自动礼让）
      ├── compact-guard.js       — 静默 /compact、视口滚动盾、/clear 轻重开与锚点续接
      ├── draft-guard.js         — 按会话未发送草稿自动保护
      ├── prompt-queue.js        — 流式排队预写与四重安全熔断出队（含 NOV Spec 写锁）
      ├── prompt-library.js      — Ctrl/Cmd+Alt+P 提示词命令面板、{{变量}} 片段库与只读 NOV 模板
      ├── reading-nav.js         — 长代码块自动折叠、吸顶复制条与 Alt+↑/↓ 迷你轮次导轨
      ├── safe-auto-accept.js    — 策略门控自动审批 + 不可绕过 POSIX/Windows 铁壁高危黑名单
      ├── theme-studio.js        — 零 :has() 15 套光学皮肤、8 套外观方案、材质圆角、流式淡入与丝滑光标
      ├── quota-pulse.js         — 100% 只读 5h/7d 配额估算与限流信号解析
      ├── status-pill.js         — 底栏统一分段状态胶囊 HUD 与 Prism 上下文卡片内嵌
      ├── settings/tab-*.js      — 模块化 6-Tab 设置页渲染器（overview / ui / conversation / guard / nov / advanced）
      └── prism-bridge.js        — 设置中心外壳、全局搜索、动态快捷键表与 Ctrl/Cmd+Alt+, 全局抽屉
```

**五条安全红线**：
1. **零 `app.asar` 破坏**：完整保留 Google Developer ID 签名、Apple 公证与客户端自动更新。
2. **零外部联网、零凭据接触**：`quotaPulse` 坚持纯只读，绝不读取 OAuth Token 或进行号池轮换。
3. **自动审批铁壁黑名单不可绕过**：哪怕在 `custom` 白名单放行 `.*`，破坏性命令与敏感路径依然强制拦截。
4. **零 `:has()`、零 `innerHTML`、卸载零残留**：全仓 CSS 保持零 `:has()` 与零 `.ag-cs-` 冲突，全部 UI 经 `textContent` 安全渲染，支持 `destroy()` 与 `remove` 无损清除。
5. **双星与社区生态和平共存**：与 [`agy-NOV`](https://github.com/tone-leh/agy-NOV) 保持功能零重叠，同时内置对 Obsidian Prism 的设置页融合、上下文卡内嵌、右键礼让与翻译/主题礼让机制。

---

## 本地开发与验证

```bash
npm test                 # 运行全量原生 node:test 单测套件（262/262 通过，零外部依赖）
npm run i18n:validate    # 校验全部 10 国内置 + 9 扩展界面翻译词典与正则模板（0 错误）
npm run workbench:smoke  # 对离线沙盒执行自动化 HTTP 烟雾校验（22 markers）
npm run doctor           # 只读本机环境与双星共存诊断
```

社区贡献指引见 [CONTRIBUTING.md](./CONTRIBUTING.md)，完整演进路线与产品信息架构见 [docs/ROADMAP.md](./docs/ROADMAP.md) 与 [docs/PRODUCT-IA.md](./docs/PRODUCT-IA.md)。

---

## 致谢、上游引用与灵感来源

开源生态的持续进化离不开众多创作者的无私分享。以下列出本项目在研发过程中直接引用的上游开源资源，以及给予我们关键产品设计灵感与交互参考的优秀社区项目，谨此致谢。

### 1. 引用的上游开源资源

完整原始版权声明与许可证全文忠实保留于 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)：

- **[`yiheng8023/antigravity-chinese`](https://github.com/yiheng8023/antigravity-chinese)**（`v3.3.65`，`MIT License`）—— `packages/core/locales/ext/zh-CN.json` 引用并适配了其简体中文 UI 词典与动态正则模板（转换捕获语法为 `{N}` 并与 `agy-Sag` 内置 465 核心词库去重），其余 8 语种扩展词库基于其去重后的英文界面词条表独立重译；在 `agy-Sag` 中以 Zero-ASAR 零改动宿主安装包与 `WeakMap` 无损还原引擎运行。

### 2. 设计灵感与生态参考致谢

下列开源项目为 `agy-Sag` 的交互设计、主题美学、状态栏信息密度与共存机制提供了重要启发；本项目中的对应功能均基于 MIT 协议进行净室独立实现：

- **[Obsidian Prism（`RMvdesi/obsidian-prism`）](https://github.com/RMvdesi/obsidian-prism)**（`GPL-3.0`）—— Google Antigravity 原生光学界面套件的标杆先驱。启发了我们在 **设置 → 外观（Settings → Appearance）** 嵌入统一控制中心、零 `:has()` 光学主题体系、`CSS.highlights` 五级水墨流式淡入、FastDOM 丝滑输入光标、`0fps` 底缘语义微光、长代码块折叠与侧边大纲、`plugin://` 扩展面板变量同步、`/btw` 右键工作流，以及双插件 CDP 与守护进程和平共存礼让机制。
- **[AGY Beautify（`AreSet01/antigravity-theme`）](https://github.com/AreSet01/antigravity-theme)** —— Antigravity 客户端多风格主题与美化包。其极具辨识度的风格化皮肤创意（抹茶手帐 Matcha、怪盗猩红 Phantom、线稿素描 Doodle、像素终端 Pixel）与免重启即时换肤理念，直接启发了 `themeStudio` 的风格皮肤画廊与 8 套一键外观方案设计。
- **[`0DNANCY/agy-claude-style`](https://github.com/0DNANCY/agy-claude-style)**（`MIT`）—— Antigravity 早期界面美化、暗色配色架构与轻量化 CDP 注入思路的重要先行参考。
- **[`sirmalloc/ccstatusline`](https://github.com/sirmalloc/ccstatusline)**（`MIT`）与 **[`Owloops/claude-powerline`](https://github.com/Owloops/claude-powerline)**（`MIT`）—— 启发了输入框底栏紧凑型多段式状态胶囊 HUD（按模块开关动态增删分段）的视觉层级与信息密度。
- **[`SuperClaude-Org/SuperClaude_Framework`](https://github.com/SuperClaude-Org/SuperClaude_Framework)**（`MIT`）—— 启发了 `promptLibrary` 面向工程研发的斜杠指令与结构化提示词模板体系。
- **[`cline/cline`](https://github.com/cline/cline)**（`Apache-2.0`）与 **[`winfunc/opcode`](https://github.com/winfunc/opcode)**（`AGPL-3.0`，原 *Claudia*）—— 启发了对话流每轮 `⤺` 三选一恢复微菜单（衔接 `agy-NOV guard` 检查点回滚）、上下文构成透视与跨会话档案管理体验。
- **[`tone-leh/agy-NOV`](https://github.com/tone-leh/agy-NOV)**（`MIT`）—— 本项目的纯原生双星搭档，提供零 CDP MCP Apps 与 Lifecycle Hooks 工程工作台、统一 `--nov-*` / `--sag-*` 视觉设计语言及零重叠协同架构。

> 若您在致谢名单中发现任何遗漏、署名偏差或链接错误，欢迎随时提交 Issue 或 Pull Request，我们将第一时间核实补充。

---

## 开源协议

MIT © [tone-leh](https://github.com/tone-leh)
