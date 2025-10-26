/**
 * Custom Endpoint Executor
 * Calls developer-provided API endpoints for agent execution
 */

import axios, { AxiosError } from 'axios';

interface EndpointConfig {
    endpoint: string;
    method?: 'POST' | 'GET';
    auth?: string;
    timeout?: number;
    headers?: Record<string, string>;
}

interface EndpointRequest {
    agentId: number;
    executor: string;
    params: any;
    marketData?: any;
}

interface EndpointResponse {
    signal?: 'BUY' | 'SELL' | 'HOLD';
    confidence?: number;
    reasoning?: string;
    result?: any;
    error?: string;
}

/**
 * Call developer's custom endpoint
 */
export async function callCustomEndpoint(
    config: EndpointConfig,
    request: EndpointRequest
): Promise<any> {
    const {
        endpoint,
        method = 'POST',
        auth,
        timeout = 10000,
        headers = {},
    } = config;

    console.log(`\n🌐 Calling custom endpoint: ${endpoint}`);
    console.log(`   Method: ${method}`);
    console.log(`   Timeout: ${timeout}ms`);

    try {
        // Validate endpoint URL
        const url = new URL(endpoint);
        if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('Invalid protocol. Only HTTP and HTTPS are supported.');
        }

        // Prepare headers
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'AgentMarketplace/1.0',
            ...headers,
        };

        if (auth) {
            requestHeaders['Authorization'] = auth;
        }

        // Make request
        const startTime = Date.now();
        const response = await axios({
            method,
            url: endpoint,
            data: method === 'POST' ? request : undefined,
            params: method === 'GET' ? request : undefined,
            headers: requestHeaders,
            timeout,
            validateStatus: (status) => status < 500, // Don't throw on 4xx
        });

        const duration = Date.now() - startTime;
        console.log(`✅ Endpoint responded in ${duration}ms`);
        console.log(`   Status: ${response.status}`);

        // Check response status
        if (response.status >= 400) {
            throw new Error(
                `Endpoint returned error status ${response.status}: ${JSON.stringify(response.data)}`
            );
        }

        // Validate response structure
        const result = response.data as EndpointResponse;

        // If response has standard fields, use them
        if (result.signal || result.result) {
            return {
                signal: result.signal || 'HOLD',
                confidence: result.confidence || 0.7,
                reasoning: result.reasoning || 'Custom endpoint execution',
                customResult: result.result || result,
                executionTime: duration,
                endpoint,
            };
        }

        // Otherwise return raw response
        return {
            signal: 'HOLD',
            confidence: 0.7,
            reasoning: 'Custom endpoint returned data (see customResult)',
            customResult: result,
            executionTime: duration,
            endpoint,
        };

    } catch (error) {
        const duration = Date.now() - Date.now();
        console.error(`❌ Custom endpoint failed:`, error);

        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            if (axiosError.code === 'ECONNABORTED') {
                throw new Error(`Endpoint timeout after ${timeout}ms`);
            }

            if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
                throw new Error(`Cannot reach endpoint: ${endpoint}`);
            }

            if (axiosError.response) {
                throw new Error(
                    `Endpoint error (${axiosError.response.status}): ${JSON.stringify(axiosError.response.data)}`
                );
            }
        }

        throw new Error(`Failed to call custom endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Validate endpoint configuration
 */
export function validateEndpointConfig(config: any): config is EndpointConfig {
    if (!config || typeof config !== 'object') {
        return false;
    }

    if (!config.endpoint || typeof config.endpoint !== 'string') {
        return false;
    }

    try {
        const url = new URL(config.endpoint);
        if (!['http:', 'https:'].includes(url.protocol)) {
            return false;
        }
    } catch {
        return false;
    }

    if (config.method && !['POST', 'GET'].includes(config.method)) {
        return false;
    }

    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout < 1000 || config.timeout > 30000)) {
        return false;
    }

    return true;
}

/**
 * Health check for endpoint
 */
export async function checkEndpointHealth(endpoint: string, timeout = 5000): Promise<boolean> {
    try {
        const response = await axios.get(endpoint, {
            timeout,
            validateStatus: (status) => status < 500,
        });
        return response.status < 400;
    } catch {
        return false;
    }
}
