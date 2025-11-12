// routes/dailyTransactionRoutes.js
import express from 'express';
import { getDailyTransactions, addDebit , transferBalance, addCredit, closeDay, undoClose, setOpeningBalance} from '../controllers/dailyTransactionController.js';

const router = express.Router();

router.get('/', getDailyTransactions);
router.post('/debit', addDebit);
router.post('/transfer', transferBalance);
router.post('/credit', addCredit);
router.post('/close', closeDay);
router.post('/undo-close', undoClose);
router.post('/opening-balance',setOpeningBalance);
export default router;