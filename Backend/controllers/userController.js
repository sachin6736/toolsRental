import mongoose from 'mongoose';
import User from '../models/user.js';
import Rental from '../models/rental.js';
import DailyTransaction from '../models/dailyTransaction.js';
import multer from 'multer';
import upload from '../utils/upload.js';

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'Uploads/');
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`);
//   },
// });
// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith('image/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only images are allowed'), false);
//     }
//   },
// });

// Helper function to get or create a DailyTransaction for a specific date
const getOrCreateDailyTransaction = async (dateStr) => {
  let dailyTransaction = await DailyTransaction.findOne({ date: dateStr });
  if (!dailyTransaction) {
    dailyTransaction = new DailyTransaction({
      date: dateStr,
      transactions: [],
    });
    await dailyTransaction.save();
  }
  return dailyTransaction;
};

export const createUser = [
  upload.single('aadharImage'),
  async (req, res) => {
    try {
      const { name, adress, phone, aadhar, profession } = req.body;
      const aadharImage = req.file ? req.file.path : undefined; // Cloudinary URL

      if (!name || !phone) return res.status(400).json({ message: 'Name and phone are required' });
      if (!/^[0-9]{10}$/.test(phone)) return res.status(400).json({ message: 'Phone number must be 10 digits' });
      if (aadhar && !/^[0-9]{12}$/.test(aadhar)) return res.status(400).json({ message: 'Aadhar number must be 12 digits' });

      const aadharValue = aadhar?.trim() ? aadhar : null;

      const existingUser = await User.findOne({ $or: [{ phone }, { aadhar: aadharValue }] });
      if (existingUser) {
        return res.status(400).json({
          message: existingUser.phone === phone
            ? 'User with this phone number already exists'
            : 'User with this Aadhar number already exists',
        });
      }

      const newUser = new User({ name, adress, phone, aadhar: aadharValue, aadharImage, profession });
      await newUser.save();
      res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        return res.status(400).json({
          message: error.keyValue.phone
            ? 'User with this phone number already exists'
            : 'User with this Aadhar number already exists',
        });
      }
      res.status(500).json({ message: error.message || 'Server error' });
    }
  },
];

export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', hasCredit } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { aadhar: { $regex: search, $options: 'i' } },
        { adress: { $regex: search, $options: 'i' } },
        { profession: { $regex: search, $options: 'i' } },
      ];
    }

    if (hasCredit === 'true') {
      query.totalCredit = { $gt: 0 };
    }

    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('name phone adress aadhar aadharImage profession totalCredit');

    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers,
        hasMore: page * limit < totalUsers,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateUser = [
  upload.single('aadharImage'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, adress, phone, aadhar, profession } = req.body;
      const aadharImage = req.file ? req.file.path : undefined;

      if (!name || !phone) return res.status(400).json({ message: 'Name and phone are required' });
      if (!/^[0-9]{10}$/.test(phone)) return res.status(400).json({ message: 'Phone number must be 10 digits' });
      if (aadhar && !/^[0-9]{12}$/.test(aadhar)) return res.status(400).json({ message: 'Aadhar number must be 12 digits' });

      const aadharValue = aadhar?.trim() ? aadhar : null;

      const existingUser = await User.findOne({ $or: [{ phone }, { aadhar: aadharValue }], _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({
          message: existingUser.phone === phone
            ? 'User with this phone number already exists'
            : 'User with this Aadhar number already exists',
        });
      }

      const updateData = { name, adress, phone, aadhar: aadharValue, profession };
      if (aadharImage) updateData.aadharImage = aadharImage;

      const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
      if (!updatedUser) return res.status(404).json({ message: 'User not found' });

      res.status(200).json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        return res.status(400).json({
          message: error.keyValue.phone
            ? 'User with this phone number already exists'
            : 'User with this Aadhar number already exists',
        });
      }
      res.status(500).json({ message: error.message || 'Server error' });
    }
  },
];

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Valid User ID is required' });
    }

    const user = await User.findById(id).populate({
      path: 'orderHistory',
      populate: {
        path: 'tools.tool',
        select: 'name category price',
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const repayCredit = async (req, res) => {
  try {
    const { id } = req.params;
    const { rentalId, paymentMethod } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Valid User ID is required' });
    }
    if (!['Cash', 'UPI'].includes(paymentMethod)) {
      return res.status(400).json({ message: "Payment method must be 'Cash' or 'UPI'" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.totalCredit <= 0) {
      return res.status(400).json({ message: 'No outstanding credit to repay' });
    }

    const dateStr = new Date().toLocaleDateString('en-IN');
    const dailyTransaction = await getOrCreateDailyTransaction(dateStr);

    if (rentalId) {
      // Repay a specific credit associated with a rental
      if (!mongoose.Types.ObjectId.isValid(rentalId)) {
        return res.status(400).json({ message: 'Valid Rental ID is required' });
      }

      const creditEntry = user.credits.find(credit => credit.rentalId.toString() === rentalId);
      if (!creditEntry) {
        return res.status(404).json({ message: 'Credit entry for this rental not found' });
      }

      const rental = await Rental.findById(rentalId);
      if (!rental) {
        return res.status(404).json({ message: 'Rental not found' });
      }

      const repaymentAmount = creditEntry.amount;
      user.totalCredit -= repaymentAmount;
      user.credits = user.credits.filter(credit => credit.rentalId.toString() !== rentalId);

      const repaymentNote = `Credit repayment of ₹${repaymentAmount.toFixed(2)} for rental ${rentalId} via ${paymentMethod} on ${dateStr}.`;
      rental.notes.push({ text: repaymentNote });

      // Record transaction in DailyTransaction
      dailyTransaction.transactions.push({
        rentalId,
        user: user._id,
        amount: repaymentAmount,
        type: 'credit_repayment',
        paymentMethod,
        description: `Credit repayment for user ${user.name} (Rental ${rentalId}): ₹${repaymentAmount.toFixed(2)} via ${paymentMethod}`,
      });

      await user.save();
      await rental.save();
      await dailyTransaction.save();

      // Populate orderHistory for the response
      const updatedUser = await User.findById(id).populate({
        path: 'orderHistory',
        populate: {
          path: 'tools.tool',
          select: 'name category price',
        },
      });

      res.status(200).json({
        success: true,
        message: `Credit of ₹${repaymentAmount.toFixed(2)} repaid successfully`,
        user: updatedUser,
      });
    } else {
      // Repay all credits
      const repaymentAmount = user.totalCredit;
      const rentalIds = user.credits.map(credit => credit.rentalId);
      const uniqueRentalIds = [...new Set(rentalIds.map(id => id.toString()))];

      for (const rentalId of uniqueRentalIds) {
        const rental = await Rental.findById(rentalId);
        if (rental) {
          const rentalCredits = user.credits.filter(credit => credit.rentalId.toString() === rentalId);
          const rentalCreditAmount = rentalCredits.reduce((sum, credit) => sum + credit.amount, 0);
          const repaymentNote = `Credit repayment of ₹${rentalCreditAmount.toFixed(2)} for rental ${rentalId} via ${paymentMethod} on ${dateStr}.`;
          rental.notes.push({ text: repaymentNote });
          await rental.save();

          // Record transaction in DailyTransaction
          dailyTransaction.transactions.push({
            rentalId,
            user: user._id,
            amount: rentalCreditAmount,
            type: 'credit_repayment',
            paymentMethod,
            description: `Credit repayment for user ${user.name} (Rental ${rentalId}): ₹${rentalCreditAmount.toFixed(2)} via ${paymentMethod}`,
          });
        }
      }

      // Record a summary transaction for total repayment if multiple rentals
      if (uniqueRentalIds.length > 1) {
        dailyTransaction.transactions.push({
          user: user._id,
          amount: repaymentAmount,
          type: 'credit_repayment',
          paymentMethod,
          description: `Total credit repayment for user ${user.name}: ₹${repaymentAmount.toFixed(2)} via ${paymentMethod}`,
        });
      }

      user.credits = [];
      user.totalCredit = 0;
      await user.save();
      await dailyTransaction.save();

      // Populate orderHistory for the response
      const updatedUser = await User.findById(id).populate({
        path: 'orderHistory',
        populate: {
          path: 'tools.tool',
          select: 'name category price',
        },
      });

      res.status(200).json({
        success: true,
        message: `Total credit of ₹${repaymentAmount.toFixed(2)} repaid successfully`,
        user: updatedUser,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};