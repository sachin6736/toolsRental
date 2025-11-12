// models/dailyTransaction.js
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  rentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: false },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  amount: { type: Number, required: true, min: 0 },
  
  type: {
    type: String,
    enum: [
      'return',
      'credit_repayment',
      'accessory_purchase',
      'debit',
      'credit'
    ],
    required: true,
  },
  
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI'],
    required: true,
  },
  
  category: {
    type: String,
    enum: [
      'Rent & Utilities',
      'Labour Charges',
      'Tea & Snacks',
      'Tool Inventory & Maintenance',
      'Stationary',
      'Miscellaneous',
      'Internal Transfer',
      'Manual Credit',
      'Opening Balance'  // ← NEW CATEGORY
    ],
    required: false,
    default: null
  },
  
  description: { type: String, required: true },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const dailyTransactionSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  transactions: [transactionSchema],

  // CLOSING
  isClosed: { type: Boolean, default: false },
  closingBalance: { type: Number, default: 0 },
  closingCash: { type: Number, default: 0 },
  closingUPI: { type: Number, default: 0 },
  closedAt: { type: Date },

  // OPENING (NEW)
  openingBalance: { type: Number, default: 0 },
  openingCash: { type: Number, default: 0 },
  openingUPI: { type: Number, default: 0 },
  openingCarriedFrom: { type: String }, // e.g., "10/11/2025"

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('DailyTransaction', dailyTransactionSchema);