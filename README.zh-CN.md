# GitHub Markdown Image Lightbox

[English](./README.md) | 简体中文

在 GitHub 的 README、Issue、Pull Request 和 Gist 中，点击内容图片后直接在当前页面预览。支持滚轮缩放、拖拽平移、连续切图和键盘操作。

- 版本：`0.1.0`
- 运行环境：Chrome、Edge 或 Firefox，加 Tampermonkey（篡改猴）

## 它解决什么问题

GitHub 上的 Markdown 图片经常链接到原始文件或外部地址。默认点击后，浏览器可能离开当前页面。看完图片再返回时，还要重新寻找刚才读到的位置。

```text
GitHub 默认行为

阅读 README -> 点击图片 -> 跳到原图或外部页面 -> 返回 -> 重新找阅读位置

安装本脚本后

阅读 README -> 点击图片 -> 当前页面灯箱
                              |-- 滚轮缩放
                              |-- 拖拽平移
                              |-- 左右切图
                    关闭灯箱 -> 回到原来的阅读位置
```

脚本优先使用 GitHub 已经渲染成功的图片地址；对于链接到仓库文件的图片，
则按需转换为 `raw` 地址。外部图片会保留
`camo.githubusercontent.com` 代理地址，以降低被 GitHub 内容安全策略拦截的概率。

## 功能

- 在当前页面预览 Markdown 内容区的大图
- 支持 README，以及 Issue、Pull Request 和 Gist 中渲染的 Markdown 内容
- 将指针放在灯箱图片上滚动滚轮，以指针为中心缩放；最高为初始适配尺寸的 `8x`
- 放大后可以拖拽平移
- 使用按钮或方向键连续查看上一张、下一张图片
- 支持 Escape 关闭、数字 `0` 重置缩放
- 支持键盘打开图片和灯箱内焦点循环
- 自动适配 GitHub 的页面内导航，无需反复重载脚本
- 过滤已知徽章地址、GitHub 的 Emoji/头像类名和过小图片
- 不收集数据，不写入浏览器存储

## 安装

### 第一步：安装 Tampermonkey

先为浏览器安装 Tampermonkey。打开对应商店后，点击“添加至
Chrome”/“获取”/“添加到 Firefox”，再确认添加扩展：

- [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- [Tampermonkey 官方版本列表](https://www.tampermonkey.net/faq.php?q=Q406)

安装完成后，浏览器工具栏中会出现 Tampermonkey 图标。如果没有看到，打开
“扩展程序”（拼图）菜单，找到 Tampermonkey 并将它固定到工具栏。

### 第二步：允许 Tampermonkey 运行用户脚本

Tampermonkey 5.3 及更新版本在 Chrome、Edge 等 Chromium 浏览器中需要
User Scripts API 权限。Chrome 138 及更新版本可这样开启：

1. 右键点击浏览器工具栏中的 Tampermonkey 图标。
2. 选择“管理扩展程序”。
3. 打开“允许运行用户脚本”或 `Allow User Scripts`。

如果扩展详情页没有这个开关，启用“开发者模式”即可满足这项权限要求：

1. Chrome 打开 `chrome://extensions`，Edge 打开 `edge://extensions`。
2. 开启页面上的“开发者模式”。

“允许运行用户脚本”和“开发者模式”任选其一即可。可参考
[Tampermonkey 官方说明](https://www.tampermonkey.net/faq.php?q=Q209)。Firefox
通常不需要这一步。

### 第三步：安装脚本

#### 方法一：直接安装

点击下面的链接：

**[安装 GitHub Markdown Image Lightbox](https://raw.githubusercontent.com/cloudy-liu/github-markdown-lightbox/master/github-markdown-lightbox.user.js)**

正常情况下，Tampermonkey 会打开脚本安装页面：

1. 确认脚本名称是 `GitHub Markdown Image Lightbox`。
2. 确认匹配站点包含 `github.com` 和 `gist.github.com`。
3. 点击“安装”。
4. 打开或刷新一个带有内容图片的 GitHub 页面。

安装成功后，符合条件的图片会显示放大镜指针；点击后，页面中央会出现灯箱。
如果页面有多张图片，灯箱顶部还会显示当前序号和总数，例如 `1 / 4`。

#### 方法二：手动复制

如果点击安装链接后只看到 JavaScript 文本：

1. 打开 [`github-markdown-lightbox.user.js`](./github-markdown-lightbox.user.js)。
2. 点击 GitHub 页面右上方的 `Raw`。
3. 全选并复制页面中的全部代码。
4. 点击 Tampermonkey 图标，进入“管理面板”。
5. 点击“添加新脚本”或标签栏中的 `+`。
6. 删除编辑器内自动生成的模板。
7. 粘贴刚才复制的完整代码。
8. 按 `Ctrl+S`（macOS 为 `Command+S`）或点击编辑器的保存按钮。
9. 确认脚本右侧的开关处于启用状态。
10. 刷新 GitHub 页面。

## 使用方法

在 GitHub Markdown 内容区点击一张大图，灯箱会在当前页面打开。

| 操作 | 结果 |
| --- | --- |
| 点击内容图片 | 打开灯箱 |
| 指针位于图片上时滚动鼠标滚轮 | 以鼠标位置为中心缩放 |
| 放大后拖拽 | 平移图片 |
| 点击左、右按钮 | 查看上一张、下一张图片 |
| `Left` / `Right` | 查看上一张、下一张图片 |
| `0` | 重置缩放和平移 |
| `Escape` | 关闭灯箱 |
| 灯箱处于初始 `1x`、未放大状态时点击图片 | 关闭灯箱 |
| 点击图片外的黑色区域 | 关闭灯箱 |
| `Tab` / `Shift+Tab` | 在灯箱按钮之间移动焦点 |

带链接的图片可以用 `Enter` 打开。没有链接的图片可以用 `Enter` 或空格打开。

## 工作方式

```text
点击 .markdown-body 中的图片
  -> 排除已知徽章、GitHub 特定图片类名和过小图片
  -> 解析适合灯箱显示的图片地址
     -> 外部图片复用已渲染地址，包括 camo.githubusercontent.com
     -> 仓库 blob 图片链接按需转换为 raw 地址
  -> 在当前页面创建灯箱
  -> 提供缩放、平移、切图和键盘控制
```

脚本只申请 `GM_addStyle`，用于向页面加入灯箱样式。脚本逻辑没有远程代码
依赖，不发送统计数据，也不使用 Tampermonkey 存储。

## 常见问题

### 安装后点击图片没有反应

依次检查：

1. Tampermonkey 本身是否启用。
2. 脚本右侧的开关是否启用。
3. Chrome 或 Edge 是否已经打开“允许运行用户脚本”或开发者模式。
4. 当前地址是否以 `https://github.com/` 或 `https://gist.github.com/` 开头。
5. 是否刷新过安装脚本之前已经打开的 GitHub 页面。

### 徽章、头像或很小的图标不能打开

这是预期行为。脚本主动跳过构建状态徽章、Emoji、头像，以及宽度和高度都
小于 `200` 像素的小图。任一边达到 `200` 像素的普通内容图片仍可打开。

### 某张图片仍然无法显示

先确认它能否在原始 GitHub 页面中正常显示。脚本优先复用 GitHub 已经渲染的
图片地址，并可能将仓库图片的 `/blob/` 链接转换为 `/raw/`。如果原资源无法
访问，灯箱也无法恢复它。

### 点击安装链接后没有出现 Tampermonkey 安装页

使用上面的“手动复制”方法。还可以检查 Tampermonkey 是否有权限访问 GitHub，以及浏览器是否允许用户脚本运行。

### 如何更新

这个项目没有配置远程自动更新地址。获取新版本时，重新点击安装链接并确认更新，或者在 Tampermonkey 编辑器中用新版文件覆盖旧代码。

### 如何卸载

打开 Tampermonkey 管理面板，找到 `GitHub Markdown Image Lightbox`，点击删除即可。删除后刷新 GitHub 页面。

## 隐私和权限

- 只匹配 `github.com` 和 `gist.github.com`
- 不读取或保存账号凭据
- 不收集浏览记录或使用数据
- 不发送统计或遥测数据；打开灯箱时可能向图片源地址请求当前图片
- 不包含 `@updateURL` 或 `@downloadURL`
- 唯一的 Tampermonkey 权限是 `GM_addStyle`

## 开发检查

项目没有构建步骤或运行时依赖。修改脚本后可以直接检查 JavaScript 语法：

```powershell
node --check .\github-markdown-lightbox.user.js
```

## License

MIT
