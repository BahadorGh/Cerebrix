import { PrismaClient } from '@prisma/client';

class DatabaseService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async getAgents() {
        return this.prisma.agent.findMany({
            include: {
                deployments: true,
            },
        });
    }

    async getAgent(id: number) {
        return this.prisma.agent.findUnique({
            where: { id },
            include: {
                deployments: true,
                executions: {
                    orderBy: { timestamp: 'desc' },
                    take: 10,
                },
            },
        });
    }

    async createAgent(data: any) {
        return this.prisma.agent.create({ data });
    }

    async createExecution(data: any) {
        return this.prisma.execution.create({ data });
    }

    async updateExecutionResult(id: number, result: string, status: string) {
        return this.prisma.execution.update({
            where: { id },
            data: { result, status },
        });
    }
}

export const db = new DatabaseService();