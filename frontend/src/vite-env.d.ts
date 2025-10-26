/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_WALLETCONNECT_PROJECT_ID: string
    readonly VITE_AGENT_REGISTRY_ADDRESS: string
    readonly VITE_PAYMENT_PROCESSOR_ADDRESS: string
    readonly VITE_API_BASE_URL: string
    readonly VITE_IPFS_GATEWAY: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
