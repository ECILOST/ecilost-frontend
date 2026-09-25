/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_BASE_URL?: string;
  readonly VITE_CATALOG_BASE_URL?: string;
  readonly VITE_WALLET_BASE_URL?: string;
  readonly VITE_AUCTION_BASE_URL?: string;
  readonly VITE_AUCTIONS_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
