import express from 'express';
import { createRental , getRentals, trackRental,markReturn,markAllReturned,getDailyTransactions} from '../controllers/Rentalcontroller.js';

const router = express.Router();

router.post('/createrental', createRental);
router.get('/getrentals',getRentals);
router.get('/track/:id', trackRental);
router.post('/mark-return/:id', markReturn);
router.post('/mark-all-returned/:id', markAllReturned);
router.get('/dailytransactions', getDailyTransactions);





export default router;