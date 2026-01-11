# Requirements Document

## Introduction

A "Local-First" Point of Sale Progressive Web Application (PWA) designed for a small retail shop in Thailand. The system runs in the browser using local storage for zero-latency performance, utilizing Cloudflare Pages for hosting and Supabase for background data backup. It is designed to be developed on macOS and deployed to a Windows production environment via Chrome PWA.

## Glossary

- **System**: The POS PWA application
- **Local_DB**: Dexie.js wrapper for IndexedDB storage
- **Cloud_DB**: Supabase PostgreSQL database
- **Cashier**: User operating the point of sale system
- **Store_Owner**: User managing inventory and viewing reports
- **Cart**: Collection of products selected for purchase
- **Transaction**: Completed sale record with payment
- **Thermal_Printer**: USB-connected receipt printer using ESC/POS protocol
- **Sync_Status**: Boolean flag indicating if local data has been backed up to cloud

## Requirements

### Requirement 1: Product Sales & Cart Management

**User Story:** As a cashier, I want to process sales efficiently using minimal clicks, so that I can serve customers quickly.

#### Acceptance Criteria

1. THE System SHALL manage cart state using React Context or global state management
2. WHEN a user types in the search bar, THE System SHALL display matching products instantly
3. WHEN a user clicks a search result, THE System SHALL add one unit of that product to the Cart
4. THE System SHALL calculate total as sum of all item prices multiplied by quantities
5. WHEN "Pay" button is clicked, THE System SHALL save the transaction to Local_DB
6. WHEN a transaction is saved, THE System SHALL deduct inventory quantities in Local_DB
7. WHEN a transaction is completed, THE System SHALL trigger receipt printing
8. WHEN a transaction is saved, THE System SHALL mark the Sync_Status as false
9. WHEN "Save Draft" button is clicked, THE System SHALL save current Cart as a draft transaction
10. WHEN a draft is saved, THE System SHALL clear the current Cart for new transactions
11. THE System SHALL display a list of saved drafts with creation time and total amount
12. WHEN a user clicks on a draft, THE System SHALL load that draft into the current Cart
13. WHEN a draft is loaded, THE System SHALL remove it from the drafts list

### Requirement 2: Inventory Management

**User Story:** As a store owner, I want to manage product prices and stock, so that I can maintain accurate inventory and pricing.

#### Acceptance Criteria

1. THE System SHALL provide a CRUD interface for product management
2. THE System SHALL store product fields: Name, Description, CostPrice, SellingPrice, Quantity
3. WHEN product data is updated, THE System SHALL commit changes immediately to Local_DB
4. WHEN product quantity is below 5 units, THE System SHALL display visual low stock indicators

### Requirement 3: Historical Transaction Records

**User Story:** As a store owner, I want to see accurate profit margins even if product costs change later, so that I can track historical profitability correctly without any impact from current pricing.

#### Acceptance Criteria

1. WHEN recording a sale, THE System SHALL snapshot the CostPrice and SellingPrice at that moment
2. THE System SHALL store historical prices permanently in transaction records with no links to current product prices
3. WHEN product prices are updated, THE System SHALL never modify existing transaction records
4. THE System SHALL display transaction history sorted by date with newest first
5. THE System SHALL provide date range filtering for transaction history
6. THE System SHALL calculate historical profits using only the snapshotted prices from the transaction date

### Requirement 4: Sales Dashboard

**User Story:** As a store owner, I want to see filtered sales and profit data by date range and specific products, so that I can analyze performance for different time periods and product categories.

#### Acceptance Criteria

1. THE System SHALL calculate today's total sales in THB from Local_DB
2. THE System SHALL calculate today's total profit using snapshot cost prices
3. THE System SHALL provide a monthly view aggregating daily sales totals
4. THE System SHALL display profit calculations as total sales minus total snapshot costs
5. THE System SHALL provide quick selection buttons for "Today", "This Week", "This Month"
6. THE System SHALL provide date range picker for custom period analysis
7. THE System SHALL allow users to select specific products to include in calculations
8. WHEN date range is selected, THE System SHALL filter transactions within that period
9. WHEN product filter is applied, THE System SHALL exclude unselected products from calculations
10. THE System SHALL display filtered results showing total sales, total profit, and transaction count
11. THE System SHALL save user's last used filters for convenience

### Requirement 5: Receipt Generation and Logging

**User Story:** As a cashier, I need receipt generation that logs output during development, so that I can verify receipt content without requiring physical hardware.

#### Acceptance Criteria

1. THE System SHALL log formatted receipt output to browser console during development
2. THE System SHALL format receipts with shop name, date, time, itemized products, and total
3. THE System SHALL include Thai characters in receipt formatting
4. THE System SHALL provide a "Print Receipt" button that triggers receipt generation
5. THE System SHALL generate receipts immediately after transaction completion
6. THE System SHALL format currency amounts in Thai locale (฿1,500.00) in receipts

### Requirement 6: Offline-First Operation with Cloud Sync

**User Story:** As a store owner, I want the app to work without internet but save data to the cloud when possible, so that I never lose sales due to connectivity issues.

#### Acceptance Criteria

1. THE System SHALL cache all assets using vite-plugin-pwa for offline operation
2. THE System SHALL function completely when network is disconnected
3. WHEN the app loads, THE System SHALL check navigator.onLine status
4. WHEN online and every 5 minutes, THE System SHALL query Local_DB for unsynced records
5. WHEN unsynced records exist, THE System SHALL push them to Cloud_DB
6. WHEN cloud sync succeeds, THE System SHALL update Local_DB records to synced = true
7. WHEN Local_DB is empty but user logs in, THE System SHALL pull complete dataset from Cloud_DB

### Requirement 7: Smart Product Search

**User Story:** As a cashier, I want to find products quickly using partial names or fuzzy matching, so that I can serve customers efficiently even with incomplete information.

#### Acceptance Criteria

1. THE System SHALL respond to search queries in less than 100ms
2. WHEN the app starts, THE System SHALL load all active products into memory
3. WHEN user enters search terms, THE System SHALL tokenize input by spaces
4. THE System SHALL filter products where all tokens appear in Name or Description fields
5. THE System SHALL sort results with exact matches first, then partial matches
6. THE System SHALL support fuzzy matching for misspelled product names
7. WHEN user types Thai characters, THE System SHALL also search romanized versions
8. THE System SHALL highlight matching text portions in search results
9. THE System SHALL remember frequently searched products and prioritize them in results

### Requirement 8: Cloudflare Hosting with SPA Routing

**User Story:** As a developer, I want the app hosted reliably with proper SPA routing, so that page refreshes don't cause 404 errors.

#### Acceptance Criteria

1. THE System SHALL be hosted on Cloudflare Pages
2. THE System SHALL generate a _redirects file containing "/* /index.html 200"
3. WHEN users refresh any route, THE System SHALL serve index.html instead of 404 errors
4. THE System SHALL automate deployment pipeline from GitHub push to Cloudflare build to deploy

### Requirement 9: Authentication and Data Security

**User Story:** As a store owner, I want my business data protected from unauthorized access, so that only I can view sales and inventory information.

#### Acceptance Criteria

1. THE System SHALL require user authentication before accessing any business data
2. WHEN an unauthenticated user visits the site, THE System SHALL display only a login screen
3. THE System SHALL use Supabase Auth for secure user authentication
4. THE System SHALL store all sensitive data (transactions, inventory) only after successful authentication
5. THE System SHALL automatically log out users after 8 hours of inactivity
6. THE System SHALL clear all local data when user logs out

### Requirement 10: Thai Localization

**User Story:** As a Thai user, I want the interface in Thai language with proper currency formatting, so that I can use the system naturally.

#### Acceptance Criteria

1. THE System SHALL use Kanit Google Font for all UI text
2. THE System SHALL display all labels and buttons in Thai language
3. THE System SHALL format all currency using Intl.NumberFormat('th-TH') with THB symbol
4. THE System SHALL display numbers in Thai locale format (e.g., ฿1,500.00)