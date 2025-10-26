export class IPFSService {
    private pinataJWT: string | null = null;
    private gatewayUrl: string;

    constructor() {
        this.gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud';
        this.pinataJWT = process.env.PINATA_JWT || null;
    }

    async initialize() {
        if (this.pinataJWT) {
            try {
                // Test Pinata connection
                const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${this.pinataJWT}`,
                    },
                });

                if (response.ok) {
                    console.log('📦 Connected to Pinata IPFS service');
                } else {
                    throw new Error('Authentication failed');
                }
            } catch (error) {
                console.warn('⚠️  Pinata connection failed:', error);
                console.warn('   IPFS features will use public gateways (read-only)');
                this.pinataJWT = null;
            }
        } else {
            console.warn('⚠️  No PINATA_JWT found in environment');
            console.warn('   IPFS features will use public gateways (read-only)');
            console.warn('   Get your JWT from https://app.pinata.cloud/');
        }
    }

    /**
     * Upload data to IPFS via Pinata
     */
    async upload(data: any): Promise<string> {
        if (!this.pinataJWT) {
            throw new Error('Pinata not configured. Set PINATA_JWT in .env file');
        }

        const content = JSON.stringify(data, null, 2);

        // Create FormData for Pinata API
        const formData = new FormData();
        const blob = new Blob([content], { type: 'application/json' });
        formData.append('file', blob, 'metadata.json');

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.pinataJWT}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to upload to Pinata: ${error}`);
        }

        const result: any = await response.json();
        return result.IpfsHash as string;
    }

    /**
     * Fetch data from IPFS using gateway
     */
    async fetch(cid: string): Promise<any> {
        // Try multiple gateways for reliability (with correct URLs)
        const gateways = [
            'https://gateway.pinata.cloud',
            'https://ipfs.io',
            'https://dweb.link',
            'https://w3s.link'
        ];

        let lastError: any;
        for (const gateway of gateways) {
            try {
                const url = `${gateway}/ipfs/${cid}`;
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                    }
                });

                clearTimeout(timeout);

                if (response.ok) {
                    return await response.json();
                }

                console.log(`Gateway ${gateway} returned status ${response.status} for CID ${cid}`);
            } catch (error) {
                lastError = error;
                console.log(`Failed to fetch from ${gateway}:`, error instanceof Error ? error.message : error);
                continue;
            }
        }

        throw new Error(`Failed to fetch CID ${cid} from all gateways. Last error: ${lastError?.message || 'Unknown'}`);
    }

    /**
     * Pin content (automatically done by Pinata on upload)
     */
    async pin(cid: string): Promise<void> {
        // Content uploaded via Pinata is automatically pinned
        console.log(`📌 Content already pinned: ${cid}`);
    }

    /**
     * Get IPFS gateway URL for a CID
     */
    getGatewayURL(cid: string): string {
        return `${this.gatewayUrl}/ipfs/${cid}`;
    }

    /**
     * Check if Pinata is configured and ready
     */
    isReady(): boolean {
        return this.pinataJWT !== null;
    }

    /**
     * Upload agent metadata
     */
    async uploadAgentMetadata(metadata: {
        name: string;
        description: string;
        version: string;
        author: string;
        capabilities: string[];
        parameters: any;
        documentation?: string;
        tags?: string[];
    }): Promise<string> {
        const cid = await this.upload(metadata);
        await this.pin(cid);
        return cid;
    }

    /**
     * Fetch agent metadata
     */
    async fetchAgentMetadata(uri: string): Promise<any> {
        // Extract CID from ipfs:// URI
        const cid = uri.replace('ipfs://', '');
        return await this.fetch(cid);
    }
}
