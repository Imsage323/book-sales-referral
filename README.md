# 企业小程序销售记账系统

一期基于微信小程序的图书销售记账系统，包含：

- 家长端：扫码购买、微信支付、填写地址、入群引导
- 销售方端：登录、查看专属二维码、销售数据
- 管理后台：销售方、产品、订单、发货、返点、导出

## 技术栈

- 后端：Node.js + NestJS + TypeScript + MySQL + TypeORM
- 小程序：原生微信小程序
- 管理后台：Vue 3 + Element Plus + TypeScript

## 目录结构

- `src/server`：NestJS 后端
- `src/miniprogram`：微信小程序
- `src/admin`：Vue 管理后台
- `tests`：测试文件
- `assets`：静态资源
- `docs`：设计文档和计划
