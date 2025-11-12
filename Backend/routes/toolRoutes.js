import express from 'express';
import { createTool, getTools ,updateTool} from '../controllers/toolController.js';

const router = express.Router();

router.post('/createtool', createTool);
router.get('/gettools', getTools);
router.put('/updatetool/:id', updateTool);

export default router;