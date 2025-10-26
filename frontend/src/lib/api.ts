const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function fetchAgents() {
    const res = await fetch(`${API_URL}/api/agents`);
    if (!res.ok) throw new Error('Failed to fetch agents');
    return res.json();
}

export async function fetchAgent(id: number) {
    const res = await fetch(`${API_URL}/api/agents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch agent');
    return res.json();
}

// TODO: add more API functions