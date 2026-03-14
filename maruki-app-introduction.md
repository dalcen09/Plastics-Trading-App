# MARUKI Resin Trading Management System
### Application Introduction

---

## Overview

The MARUKI Resin Trading Management System is a web-based platform designed to streamline the management of plastic resin procurement and sales activities. Built specifically for MARUKI Plastics, the system provides a centralised workspace for tracking supply sources (仕入), demand entries (需要), and automatically identifying potential trading matches between them.

The application is accessible from any modern web browser, including on mobile devices, with no software installation required.

---

## Resin Categories

All entries in the system are organised into three resin categories, each with its own dedicated section:

| Category | Japanese | Description |
|---|---|---|
| Virgin | バージン | First-use, unprocessed resin |
| Off-grade | オフグレード | Below-standard or surplus grade resin |
| Recycled | リサイクル | Post-consumer or post-industrial recycled resin |

---

## Key Features

### Supply & Demand Tables
Each category contains two tables — **Supply (仕入)** and **Demand (需要)** — displayed in a spreadsheet-style layout. Users can add, edit, and delete records directly within the table. Columns can be shown or hidden to suit individual working preferences.

### Search, Filter & Sort
Records can be searched by counterparty name, manufacturer, or grade. Advanced filters allow narrowing results by resin type, sub-type, melt flow index (MI), quantity, price, and more. All columns support ascending and descending sort.

### Matching Analysis
The system automatically compares all active supply and demand entries across each category and identifies compatible pairs based on resin type, sub-type, MI range, and other criteria. Each match is assigned a compatibility score. Matches are accessible from the **Matching Analysis (マッチング分析)** section in the navigation, with breakdowns available per resin category.

### Excel Import & Export
Data can be imported from Excel files using Japanese column headers, making it straightforward to migrate from existing spreadsheets. All table data can also be exported back to Excel at any time for reporting or external sharing.

### Recycle Bin
Deleted records are moved to a **Recycle Bin (ゴミ箱)** rather than being permanently removed. Items can be restored to their original table or permanently deleted from the recycle bin. This two-step process prevents accidental data loss.

### Open / Closed Status
Each entry can be marked as **Open (オープン)** or **Closed (クローズ)** to indicate whether it is still active. Closed entries remain visible in the table for record-keeping but are excluded from matching analysis.

---

## Navigation

The left-hand sidebar provides access to all sections of the application:

- **バージン / オフグレード / リサイクル** — Category pages with supply and demand tables
- **マッチング分析** — Matching analysis with results broken down by category
- **ゴミ箱** — Recycle bin for recently deleted entries

On mobile devices, the sidebar is accessed via the **hamburger menu (☰)** in the top-left corner of the screen.

---

## Access

The system is accessed through a web browser using the URL provided by the system administrator. No account creation is currently required. The application works on desktop, tablet, and smartphone browsers.

---

*MARUKI Plastics — Internal Use*
