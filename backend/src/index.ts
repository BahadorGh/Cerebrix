// Routes
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Backend is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            contracts: contractService ? 'initialized' : 'not initialized',
            database: 'connected',
        },
    });
});