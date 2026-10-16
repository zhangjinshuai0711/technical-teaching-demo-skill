# Technical Teaching Demo

把论文、算法、源码和技术项目制作成**可手算、可操作、可核验**的教学 HTML。首版包含一个 Codex skill、两份按需读取的参考文档，以及无需构建的最小页面模板。

这套方法从四次技术教学 demo 的制作与交付复盘中提炼：先确定学习目标和证据，完成小规模教学闭环，再验收用户实际打开与操作路径。公开仓库只有原创方法、合成验证材料和新编写模板，不包含原聊天、知识库原文、论文全文或私人项目材料。

## 安装到本地 Codex

将仓库放在准备长期保留的位置：

```sh
git clone https://github.com/zhangjinshuai0711/technical-teaching-demo-skill.git
cd technical-teaching-demo-skill
skill_install_dir="${CODEX_HOME:-$HOME/.codex}/skills"
mkdir -p "$skill_install_dir"
ln -s "$PWD/technical-teaching-demo" "$skill_install_dir/technical-teaching-demo"
```

命令适用于 macOS/Linux。若同名目录或链接已经存在，先核对其内容，不覆盖。链接安装需保留仓库原位置；移动仓库后需更新链接。也可以把 `technical-teaching-demo/` 整个复制到个人 skills 目录，但更新时需要重新同步。

安装后在新聊天中显式调用 `$technical-teaching-demo`；也可由支持自动 skill 路由的客户端选择。本次验证的本机环境可从 `~/.codex/skills` 发现该 skill；不同客户端的发现路径及刷新时机可能不同。目录存在不等于当前聊天已经刷新 skill 列表。

## 使用示例

```text
使用 $technical-teaching-demo，把我提供的算法材料做成一个小 HTML。
我会基础 Python，但不了解这个算法；希望能手算一次、改变参数，
并解释找不到结果时的行为。请验证离线打开、HTTP 和重启方式。
```

```text
使用 $technical-teaching-demo，为这篇论文制作交互精读课程。
我熟悉基础概念，重点看机制推导、源码的有效分支与实验口径。
先给出覆盖计划，说明原始报告、实现与教学简化之间的差别。
```

```text
使用 $technical-teaching-demo，用一个开关演示这段源码在两种配置下的行为，
展示中间量与最终输出。只做这一处机制，不添加完整课程功能。
```

适用：交互教学页面、机制实验、技术精读课程。普通摘要、翻译、问答、代码修复按原请求处理，不自动扩大为课程。

## 内容与最小模板

- [Skill 入口](technical-teaching-demo/SKILL.md)：目标校准、手算闭环、按需读取和交付要求。
- [教学设计与证据](technical-teaching-demo/references/teaching-and-evidence.md)：资料定位、陈述分层、有效分支与数值核查。
- [验收与交付](technical-teaching-demo/references/verification-and-delivery.md)：交互、视觉、访问、恢复和证据边界。
- [最小页面](technical-teaching-demo/assets/minimal-demo/index.html)：章节目录、连续正文、加权评分实验、自测和来源边界。

复制 `assets/minimal-demo/` 到你的课程项目，修改 HTML 正文和 JavaScript 计算。不要直接把安装目录当课程项目。模板可断网打开，不调用模型或外部 API，不保存个人数据。

HTTP 预览只需 Python 3.9+：

```sh
cd technical-teaching-demo/assets/minimal-demo
python3 serve.py
```

将终端地址复制到浏览器。服务只监听 `127.0.0.1`、仅服务模板目录；保持终端进程运行，Ctrl+C 停止，重跑命令恢复。端口占用时加 `--port 8766` 或 `--port 0`。其他打开与打包说明见[模板用法](technical-teaching-demo/assets/minimal-demo/README.md)。

## 验证与版本

基础交付检查只依赖 Python 标准库：

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
```

浏览器检查使用已有 Playwright 与 Chrome/Chromium（仅开发检查需要，模板不需要）：

```sh
node tests/browser.cjs
```

若模块不在 Node 默认搜索路径，设置 `PLAYWRIGHT_MODULE` 为已有 Playwright 包的绝对路径；若没有 Playwright 下载的浏览器，设置 `CHROME_PATH` 为本机 Chrome 可执行文件。`PYTHON` 可指定 Python，`TEST_OUTPUT` 可指定截图与报告目录。检查脚本不会自动下载浏览器或安装依赖。

结构检查可使用 Codex `skill-creator` 提供的 `quick_validate.py`（该开发工具需要 PyYAML）。详见 [v0.1.0 验证记录](VERIFICATION.md)和[版本说明](CHANGELOG.md)。

模板检查、skill 样例表现、课程技术语义和学习者掌握是不同结论。本仓库的验证不能证明任意未来课程正确，也不代表原论文实验已经复现。四次来源偏论文，通用能力仅在小规模算法与源码任务中作行为验证。

## 许可

[MIT](LICENSE)，覆盖本仓库原创内容。以后使用者提供的论文、图表、源码、数据或其他素材保留各自权利与许可；本许可证不授予第三方材料的再分发权。
