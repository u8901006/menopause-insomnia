# Menopause Insomnia Daily Report

更年期失眠文獻日報 — 每日自動更新

## 簡介

本專案透過 GitHub Actions 定時排程（每日 GMT+8 23:25），自動從 PubMed 擷取過去 7 天內最新的更年期失眠相關研究文獻，經 Zhipu AI（GLM-5-Turbo）分析後生成精美的 HTML 日報，部署至 GitHub Pages。

## 涵蓋範圍

- 更年期失眠、血管舒縮症狀與睡眠
- 荷爾蒙療法、CBT-I、非藥物治療
- 營養與生活型態介入
- 神經內分泌機制、HPA 軸、發炎指標
- 憂鬱、焦慮與更年期心理健康
- 睡眠呼吸中止、不寧腿症候群
- 社會文化與公共衛生視角

## 技術架構

| 元件 | 技術 |
|------|------|
| 文獻來源 | PubMed E-utilities API |
| AI 分析 | Zhipu GLM-5-Turbo（fallback: GLM-4.7 → GLM-4.7-Flash）|
| 執行環境 | Node.js 24 |
| 排程 | GitHub Actions (cron) |
| 部署 | GitHub Pages |
| 配色 | 暖奶油色/銅色 (#8c4f2b / #f6f1e8) |

## 連結

- [李政洋身心診所](https://www.leepsyclinic.com/)
- [訂閱電子報](https://blog.leepsyclinic.com/)
- [Buy Me a Coffee](https://buymeacoffee.com/CYlee)

## 授權

本專案僅供學術研究與衛教參考，不構成醫療建議。
