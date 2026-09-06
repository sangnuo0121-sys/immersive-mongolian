# 沉浸式学蒙古语 / Immersive Mongolian

[![Quality checks](https://github.com/sangnuo0121-sys/immersive-mongolian/actions/workflows/ci.yml/badge.svg)](https://github.com/sangnuo0121-sys/immersive-mongolian/actions/workflows/ci.yml)

一个面向蒙古语学习者的双语全栈应用，涵盖字母、主题词库、每日学习、发音贡献、文化内容、排行榜与学习进度。

## 主要功能

- 中英双语界面和传统蒙古文 SVG 渲染
- 主题词库、每日任务、复习与 XP 等级系统
- 社区发音上传、投票和管理员审核
- 蒙古文化文章、口述档案、智慧语录与特别鸣谢
- Supabase 邮箱登录、用户资料和管理员后台
- 响应式桌面侧栏与移动端底部导航

## 技术栈

- Next.js 16、React 19、TypeScript
- Tailwind CSS 4、shadcn/ui、Radix UI
- Supabase Auth、PostgreSQL、Storage 和 RLS
- pnpm 11

## 本地运行

要求：Node.js 20 或更高版本、pnpm 11。

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

打开 [http://localhost:5000](http://localhost:5000)。

## 环境变量

在 `.env.local` 或部署平台中配置：

| 变量 | 用途 | 是否可公开 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 | 是 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名公钥 | 是 |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端管理操作 | 否 |
| `BOOTSTRAP_ADMIN_EMAIL` | 首位管理员邮箱 | 否 |
| `BOOTSTRAP_ADMIN_PASSWORD` | 首位管理员初始密码 | 否 |
| `FEEDBACK_RESOLVE_CODE` | 旧版反馈维护密码，可选 | 否 |

不要创建名为 `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` 的变量。带 `NEXT_PUBLIC_` 前缀的值可能被打包到浏览器端。

## Supabase 初始化

1. 在 Supabase 创建项目并填写环境变量。
2. 按需创建 `word-audio`、`acknowledgements-images`、`culture-articles-images` 和 `oral-archives-audio` buckets。
3. 在 SQL Editor 中执行数据库结构脚本。
4. 依次执行：

```text
supabase/migrations/0001_auth_profiles_xp_levels.sql
supabase/migrations/0002_secure_content_rls.sql
```

第二个迁移会关闭旧的公开写入权限：公共用户只能读取；登录用户只能维护自己的贡献；分类、公告、等级等系统数据仅管理员可修改。

更完整的手工配置说明见 `SUPABASE_SETUP.md`。

## 常用命令

```bash
pnpm dev          # 启动开发服务器（端口 5000）
pnpm validate     # TypeScript + ESLint 阻断项检查
pnpm build        # 生产构建
pnpm start        # 启动已构建的服务
```

## 安全说明

- `.env*`、构建目录、依赖目录和本地素材已通过 `.gitignore` 排除。
- 普通 Supabase 客户端始终使用 anon key；service role 仅用于明确的服务端管理操作。
- 新增、修改和删除接口会在服务端校验登录状态、所有者或管理员角色。
- 部署已有数据库时，也必须执行最新 RLS 迁移；只更新应用代码不会自动改变数据库策略。

## 项目结构

```text
src/app/                 页面与 API 路由
src/components/          业务和 UI 组件
src/context/             全局学习状态
src/lib/                 认证、渲染和业务工具
src/storage/database/    Supabase 与数据结构
supabase/migrations/     数据库迁移
public/                  字体、图片和预渲染蒙古文资源
scripts/                 构建与 SVG 生成脚本
```

## 开源许可

本项目采用 [MIT License](LICENSE)。
