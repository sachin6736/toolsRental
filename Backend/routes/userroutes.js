import express from "express";
import { createUser,getUsers, updateUser ,getUserById,repayCredit} from "../controllers/usercontoller.js";

const router = express.Router();

// POST /api/users
router.post("/createuser", createUser);
router.get('/getusers', getUsers);
router.put('/updateuser/:id', updateUser);
router.get('/getuser/:id', getUserById);
router.post('/repaycredit/:id', repayCredit);

export default router;
