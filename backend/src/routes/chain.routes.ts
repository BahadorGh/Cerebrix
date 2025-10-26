import { Router } from 'express';
import { TESTNET_CHAINS } from '../config/chains';

const router = Router();

router.get('/', (req, res) => {
    res.json({
        chains: TESTNET_CHAINS,
        count: TESTNET_CHAINS.length,
    });
});

export default router;