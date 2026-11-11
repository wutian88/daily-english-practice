# 每日英语 · 小学与初中

免费、无需登录的独立离线 PWA。小学 **24 课、146 个词汇／表达**；初中 **32 课、256 个词汇／表达**；另有 **6 项小学发音基础**和 **8 项初中发音基础**。课程按通用基础难度编排，不对应特定教材版本，不宣称覆盖全部中小学词汇或完整课程标准。

线上地址：https://wutian88.github.io/daily-english-practice/

## 课程

小学六个单元：字母起步、认识彼此、身边世界、吃喝与喜好、生活小能手、一起去探索。每课 6–8 个词汇／表达、3 个双语常用句、4 轮双语对话、2 个替换表达提示与词义小测。

初中八个单元：基础句型、校园生活、习惯与日常、正在发生、过去经历、计划与邀请、比较与建议、综合表达。每课 8 个词汇／表达、4 句短文与双语常用句、4 轮对话、2 个表达提示、词义／句型／基础阅读理解小测。

词句与对话为本项目编写。口语训练采用听示范、看提示、录音、回放对照与自评，不生成自动发音分数。系统朗读并非真人教师纠音，音色和口音取决于设备。

## 使用

1. 手机上用 Safari 或新版浏览器打开网址，可添加到主屏幕。
2. 顶部切换小学／初中；“课程”可自由选课。词条自评“再练／困难／良好／熟练”安排间隔复习。
3. “口语”提供发音基础、单词跟读和句子跟读；点击录音后允许麦克风，最长 60 秒。切换到后台会停止并尝试保存。每项只保留最新一条，重录先确认，可回放或删除。
4. 搜索当前学段的课程与自定义词库，支持词义、例句和自定义音标。无结果可一键打开有道或必应词典，自动带上搜索词，不自动导入外部结果。
5. 首次联网完整加载并缓存后，课程和小测可离线使用；断网朗读取决于设备是否安装本地英文语音。iPhone 可在系统设置中搜索语音／朗读内容并下载英文声线。
6. “我的”可检查更新与导出／导入 JSON 备份。备份含两个学段的进度和自定义词库，**不含录音**。换设备、清理网站数据或卸载前请备份。浏览器与主屏幕应用可能使用不同存储。

## 数据隔离

此项目不修改原 `ai-english-pronunciation` 应用，也不包含其 AI 英语、粤语或个人项目资料。

- 独立 IndexedDB：`daily-english-practice-v1`。
- 独立安装 ID、start_url、Service Worker 作用域：`/daily-english-practice/`；Workbox cacheId：`daily-english-practice`。
- 备份带 `app: daily-english-practice` 标识，只接受本应用 `primary`／`middle` 的合法课程和词条。
- 进度、词库和录音保存在当前设备；无后端、账号、API Key、广告或分析埋点。
- 不提供完整版个人进度 Issue 的提交或恢复入口。外部词典需联网；点击时会向对应网站提交搜索词。

## 开发与验证

Node.js 24（或兼容版本）：

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm exec vite preview -- --host 127.0.0.1
```

GitHub Actions 在 main 更新时测试、构建并发布 dist 到 Pages。仓库 Pages 来源须为 GitHub Actions。

自动检查涵盖 56 课的稳定 ID、双语完整性、每课结构、词条例句匹配、课程分组、备份学段隔离、搜索、复习排期和模拟音频录音生命周期。浏览器检查包含手机窄屏、课程切换、小测、搜索及口语入口。模拟音频测试不代表真实 iPhone 麦克风或系统语音已经实测。

学习方法可参考 [British Council 口语练习](https://learnenglish.britishcouncil.org/free-resources/speaking) 和 [儿童语音活动](https://learnenglishkids.britishcouncil.org/speak-spell/sounds)，未复制其中音视频或课程。录音使用标准 [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)，合成示范使用 Web Speech API。
