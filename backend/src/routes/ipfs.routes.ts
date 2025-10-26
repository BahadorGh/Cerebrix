import { Router, Request, Response } from 'express';
import { ipfsService } from '../services';

const router = Router();

/**
 * POST /api/ipfs/upload
 * Upload agent metadata or files to IPFS
 */
router.post('/upload', async (req: Request, res: Response) => {
    try {
        let dataToUpload: any;

        // Use JSON body
        if (req.body && Object.keys(req.body).length > 0) {
            dataToUpload = req.body;
        } else {
            return res.status(400).json({
                success: false,
                error: 'No data provided'
            });
        }

        const hash = await ipfsService.upload(dataToUpload);

        res.json({
            success: true,
            hash,
            gateway: `https://gateway.pinata.cloud/ipfs/${hash}`
        });
    } catch (error) {
        console.error('IPFS upload error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to upload to IPFS'
        });
    }
});

/**
 * GET /api/ipfs/:hash
 * Retrieve data from IPFS by hash
 */
router.get('/:hash', async (req: Request, res: Response) => {
    try {
        const { hash } = req.params;

        if (!hash) {
            return res.status(400).json({
                success: false,
                error: 'IPFS hash required'
            });
        }

        const data = await ipfsService.fetch(hash);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('IPFS retrieval error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to retrieve from IPFS'
        });
    }
});

export default router;
