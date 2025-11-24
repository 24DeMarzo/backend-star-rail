import express from 'express';
import { createWebpayOrder, commitWebpayOrder, simulateSuccess } from '../controllers/webpayController.js';

const router = express.Router();

router.post('/create', createWebpayOrder);
router.post('/commit', commitWebpayOrder);
router.post('/simulate-success', simulateSuccess);

export default router;
