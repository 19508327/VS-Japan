# VS Japan · 周期罗盘

手机优先的中日经济周期对照实验工具。**研究用途，不是预测、投资指令或已验证的金融分析产品。**

## 功能（V2.1，持续验证）

- 选择中国观察年、月与研究视角；参考日本 1985—2025 年历史候选。
- 重点比较**股票价格指数的 12 个月和 6 个月变化率**、**每美元本币数量的 12 个月变化**；两国股票指数点位不可直接比较。
- 补充世界银行 WDI 的贷款利率、ILO 模型估计青年失业率、广义货币增长、通胀、实际 GDP。
- 明示可比指标数量、覆盖率、缺失项及数据来源。缺失必需指标时不输出相似年份。
- PWA 离线缓存网站外壳；联网更新仍取决于外部数据服务。
- 生成 ChatGPT 深度研究提示词，无需在网页填写 API Key。

## 数据来源与限制

- OECD 金融市场月度股价指标（经 FRED 转发）：[中国 SPASTT01CNM661N](https://fred.stlouisfed.org/series/SPASTT01CNM661N)、[日本 SPASTT01JPM661N](https://fred.stlouisfed.org/series/SPASTT01JPM661N)。这是 **OECD 份额价格综合指标**，并非“上证综指 vs 日经225”。
- 美元兑人民币与美元兑日元的日度汇率（经 FRED 转发）：[DEXCHUS](https://fred.stlouisfed.org/series/DEXCHUS)、[DEXJPUS](https://fred.stlouisfed.org/series/DEXJPUS)。当前取每月最后一个可用观测值，不是月均值。
- [世界银行 WDI API](https://api.worldbank.org/v2/)：NY.GDP.MKTP.KD.ZG、FP.CPI.TOTL.ZG、SL.UEM.1524.ZS、FR.INR.LEND、FM.LBL.BMNY.ZG。
- **贷款利率 ≠ 中央银行政策利率**；**ILO 估计的青年失业率 ≠ 中国官方城镇青年失业率**。指标历史可能存在方法变化、断点或修订。
- 中国 OECD 股票指数最早从 1999 年开始；早期中国股票观测缺失不会通过人口或其他指标臆测。
- 页面数字与经济事件的解释必须以检索后的**原始来源**为准。数据源不可用时不使用伪造值或以 0 代替。

## 如何运行与发布

本地要求 Node 22+：

```bash
npm run check
npm test
```

`index.html` + `app.js` + `engine.mjs` 为静态前端，`api/indicators.js` 为 Vercel Serverless Function。将此仓库导入 Vercel（Framework Preset: Other），Vercel 自动识别 `api` 目录。网站需要 HTTPS 才能安装 PWA。

## 算法边界

1. 对相同指标在不同国家/年份的**变化幅度**做标准化距离。
2. **市场视角**必须具有 12 个月股票收益及 12 个月汇率变化，综合视角也要求两者齐备。
3. 缺失的维度不填充，并在结果里披露有效权重覆盖率。
4. 候选分数是**探索性距离**，不是概率，也未经历史样本外回测。
5. 年度指标与月度指标的统计时点不同；并列显示不意味着同月同日的经济快照。

## 当前发布状态

- GitHub 源码已同步。
- GitHub Actions 自动运行语法检查与比较引擎测试。
- 尚未完成移动端端到端验收、线上数据代理的生产网络验收、样本外回测。
- Vercel 部署需目标团队授权，**尚无经验证的正式访问地址**。

欢迎提出数据口径与史实审阅意见。
