// controllers/dailyTransactionController.js
import DailyTransaction from '../models/dailyTransaction.js';
import mongoose from 'mongoose';

// Helper – get or create DailyTransaction for a date
const getOrCreate = async (dateStr) => {
  let doc = await DailyTransaction.findOne({ date: dateStr });
  if (!doc) {
    doc = new DailyTransaction({ date: dateStr, transactions: [] });
    await doc.save();
  }
  return doc;
};

// GET – all transactions for a date
export const getDailyTransactions = async (req, res) => {
  try {
    const { date } = req.query;
    const query = date ? { date } : { date: new Date().toLocaleDateString('en-IN') };

    const docs = await DailyTransaction.find(query)
      .populate('transactions.user', 'name phone')
      .populate('transactions.rentalId', 'tools');

    res.json({ success: true, data: docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST – add a debit entry
export const addDebit = async (req, res) => {
    try {
      const {
        amount: rawAmount,
        category,
        notes = '',
        paymentMethod,
        description = '',
        date: customDate,
      } = req.body;
  
      const amount = parseFloat(rawAmount);
      if (isNaN(amount) || amount <= 0)
        return res.status(400).json({ message: 'Valid amount required' });
  
      if (!['Cash', 'UPI'].includes(paymentMethod))
        return res.status(400).json({ message: 'paymentMethod must be Cash办公或 UPI' });
  
      if (!category)
        return res.status(400).json({ message: 'Category required for debit' });
  
      const targetDate = customDate
        ? new Date(customDate).toLocaleDateString('en-IN')
        : new Date().toLocaleDateString('en-IN');

        const dailyCheck = await DailyTransaction.findOne({ date: targetDate });
    if (dailyCheck?.isClosed) {
      return res.status(400).json({
        success: false,
        message: 'Day is closed. Undo closing.',
      });
    }
  
      const daily = await DailyTransaction.findOne({ date: targetDate })
        .select('transactions')
        .lean();
  
      const balances = { Cash: 0, UPI: 0 };
      if (daily?.transactions) {
        daily.transactions.forEach(tx => {
          if (tx.type === 'debit') {
            balances[tx.paymentMethod] -= tx.amount;
          } else {
            balances[tx.paymentMethod] += tx.amount;
          }
        });
      }
  
      const available = balances[paymentMethod];
      if (amount > available) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${paymentMethod} balance. Available: ₹${available.toFixed(2)}, Requested: ₹${amount.toFixed(2)}`,
        });
      }
  
      let doc = await DailyTransaction.findOne({ date: targetDate });
      if (!doc) {
        doc = new DailyTransaction({ date: targetDate, transactions: [] });
      }
  
      doc.transactions.push({
        amount,
        type: 'debit',
        paymentMethod,
        category,
        description: description || `${category} expense`,
        notes,
      });
  
      await doc.save();
      res.json({ success: true, message: 'Debit recorded' });
    } catch (err) {
      console.error('addDebit error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };

  export const transferBalance = async (req, res) => {
    try {
      const {
        amount: rawAmount,
        from,        // 'Cash' or 'UPI'
        to,          // 'UPI' or 'Cash'
        notes = '',
        date: customDate,
      } = req.body;
  
      const amount = parseFloat(rawAmount);
      if (isNaN(amount) || amount <= 0)
        return res.status(400).json({ message: 'Valid amount required' });
      if (!['Cash', 'UPI'].includes(from) || !['Cash', 'UPI'].includes(to))
        return res.status(400).json({ message: 'Invalid from/to method' });
      if (from === to)
        return res.status(400).json({ message: 'Cannot transfer to same method' });
  
      const targetDate = customDate
        ? new Date(customDate).toLocaleDateString('en-IN')
        : new Date().toLocaleDateString('en-IN');

        const dailyCheck = await DailyTransaction.findOne({ date: targetDate });
    if (dailyCheck?.isClosed) {
      return res.status(400).json({
        success: false,
        message: 'Day is closed. Undo closing .',
      });
    }
  
      // --- Get current balances ---
      const daily = await DailyTransaction.findOne({ date: targetDate })
        .select('transactions')
        .lean();
  
      const balances = { Cash: 0, UPI: 0 };
      if (daily?.transactions) {
        daily.transactions.forEach(tx => {
          if (tx.type === 'debit') {
            balances[tx.paymentMethod] -= tx.amount;
          } else {
            balances[tx.paymentMethod] += tx.amount;
          }
        });
      }
  
      // --- Check sufficient balance in "from" ---
      if (amount > balances[from]) {
        return res.status(400).json({
          success: false,
          message: `Insufficient ${from} balance. Available: ₹${balances[from].toFixed(2)}`,
        });
      }
  
      // --- Save two opposite entries ---
      let doc = await DailyTransaction.findOne({ date: targetDate });
      if (!doc) {
        doc = new DailyTransaction({ date: targetDate, transactions: [] });
      }
  
      const transferNote = notes || `Transferred ₹${amount} from ${from} to ${to}`;
  
      // Debit from source
      doc.transactions.push({
        amount,
        type: 'debit',
        paymentMethod: from,
        category: 'Internal Transfer',
        description: transferNote,
        notes,
      });
  
      // Credit to destination
      doc.transactions.push({
        amount,
        type: 'credit',
        paymentMethod: to,
        category: 'Internal Transfer',
        description: transferNote,
        notes,
      });
  
      await doc.save();
  
      res.json({ success: true, message: 'Transfer recorded' });
    } catch (err) {
      console.error('transferBalance error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };

  export const addCredit = async (req, res) => {
    try {
      const {
        amount: rawAmount,
        paymentMethod, // 'Cash' or 'UPI'
        notes = '',
        description = '',
        date: customDate,
      } = req.body;
  
      const amount = parseFloat(rawAmount);
      if (isNaN(amount) || amount <= 0)
        return res.status(400).json({ message: 'Valid amount required' });
  
      if (!['Cash', 'UPI'].includes(paymentMethod))
        return res.status(400).json({ message: 'paymentMethod must be Cash or UPI' });
  
      const targetDate = customDate
        ? new Date(customDate).toLocaleDateString('en-IN')
        : new Date().toLocaleDateString('en-IN');

        const dailyCheck = await DailyTransaction.findOne({ date: targetDate });
    if (dailyCheck?.isClosed) {
      return res.status(400).json({
        success: false,
        message: 'Day is closed. Undo closing .',
      });
    }
  
      let doc = await DailyTransaction.findOne({ date: targetDate });
      if (!doc) {
        doc = new DailyTransaction({ date: targetDate, transactions: [] });
      }
  
      const finalDesc = description || `Manual ${paymentMethod} credit`;
  
      doc.transactions.push({
        amount,
        type: 'credit',
        paymentMethod,
        category: 'Manual Credit',
        description: finalDesc,
        notes,
      });
  
      await doc.save();
      res.json({ success: true, message: 'Credit added' });
    } catch (err) {
      console.error('addCredit error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };

  export const closeDay = async (req, res) => {
  try {
    const { date: customDate } = req.body;
    
    // FIX THIS LINE
    const targetDate = customDate
      ? new Date(customDate).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');

    console.log("targetDate", targetDate); // → "10/11/2025"

    let doc = await DailyTransaction.findOne({ date: targetDate });
    console.log("doc", doc);

    if (!doc) return res.status(404).json({ message: 'No transactions for this date' });
    if (doc.isClosed) return res.status(400).json({ message: 'Day already closed' });

    const balances = { cashNet: 0, upiNet: 0 };
    doc.transactions.forEach(tx => {
      const sign = tx.type === 'debit' ? -1 : 1;
      if (tx.paymentMethod === 'Cash') balances.cashNet += sign * tx.amount;
      if (tx.paymentMethod === 'UPI') balances.upiNet += sign * tx.amount;
    });

    doc.isClosed = true;
    doc.closingBalance = balances.cashNet + balances.upiNet;
    doc.closingCash = balances.cashNet;
    doc.closingUPI = balances.upiNet;
    doc.closedAt = new Date();

    await doc.save();
    res.json({ success: true, message: 'Day closed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const undoClose = async (req, res) => {
  try {
    const { date: customDate } = req.body;
    
    const targetDate = customDate
      ? new Date(customDate).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');

    let doc = await DailyTransaction.findOne({ date: targetDate });
    if (!doc) return res.status(404).json({ message: 'No transactions for this date' });
    if (!doc.isClosed) return res.status(400).json({ message: 'Day not closed' });

    // --- SCAN ALL FUTURE DAYS ---
    let checkDate = new Date(targetDate);
    checkDate.setDate(checkDate.getDate() + 1); // Start from next day

    const MAX_DAYS = 365; // Prevent infinite loop
    let daysChecked = 0;

    while (daysChecked < MAX_DAYS) {
      const checkDateStr = checkDate.toLocaleDateString('en-IN');
      
      const futureDoc = await DailyTransaction.findOne({ date: checkDateStr });
      
      if (!futureDoc) {
        // No record for this day → safe to skip
        checkDate.setDate(checkDate.getDate() + 1);
        daysChecked++;
        continue;
      }

      // If ANY future day used this closing as opening → BLOCK
      if (
        futureDoc.openingBalance > 0 && 
        futureDoc.openingCarriedFrom === targetDate
      ) {
        return res.status(400).json({
          success: false,
          message: `Cannot undo closing. This balance is used as opening balance on ${checkDateStr}.`,
        });
      }

      // If future day is closed, check next
      if (futureDoc.isClosed) {
        checkDate.setDate(checkDate.getDate() + 1);
      } else {
        // If future day is open → no carry-forward possible → safe to stop
        break;
      }

      daysChecked++;
    }

    // --- SAFE TO UNDO ---
    doc.isClosed = false;
    doc.closingBalance = 0;
    doc.closingCash = 0;
    doc.closingUPI = 0;
    doc.closedAt = null;

    await doc.save();
    res.json({ success: true, message: 'Undo successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const setOpeningBalance = async (req, res) => {
  try {
    const { date: customDate } = req.body;
    const targetDate = customDate
      ? new Date(customDate).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');

    let doc = await DailyTransaction.findOne({ date: targetDate });
    if (!doc) {
      doc = new DailyTransaction({ date: targetDate, transactions: [] });
    }

    // Prevent double set
    if (doc.openingBalance > 0) {
      return res.status(400).json({ success: false, message: 'Opening balance already set' });
    }

    // Find previous closed day
    let prevDate = new Date(targetDate);
    prevDate.setDate(prevDate.getDate() - 1);
    let prevDoc = null;

    while (prevDate.getFullYear() > 2020) {
      const prevDateStr = prevDate.toLocaleDateString('en-IN');
      prevDoc = await DailyTransaction.findOne({ date: prevDateStr, isClosed: true });
      if (prevDoc) break;
      prevDate.setDate(prevDate.getDate() - 1);
    }

    if (!prevDoc) {
      return res.status(400).json({ success: false, message: 'No previous closing balance found' });
    }

    const { closingCash, closingUPI } = prevDoc;
    const totalOpening = closingCash + closingUPI;

    if (totalOpening <= 0) {
      return res.status(400).json({ success: false, message: 'Previous closing balance is zero' });
    }

    // === ADD OPENING TRANSACTIONS ===
    if (closingCash > 0) {
      doc.transactions.push({
        amount: closingCash,
        type: 'credit',
        paymentMethod: 'Cash',
        category: 'Opening Balance',
        description: `Opening Cash from ${prevDoc.date}`,
        notes: `Carried from ${prevDoc.date}`,
        createdAt: new Date(),
      });
    }

    if (closingUPI > 0) {
      doc.transactions.push({
        amount: closingUPI,
        type: 'credit',
        paymentMethod: 'UPI',
        category: 'Opening Balance',
        description: `Opening UPI from ${prevDoc.date}`,
        notes: `Carried from ${prevDoc.date}`,
        createdAt: new Date(),
      });
    }

    // === SET OPENING FIELDS (THIS WAS MISSING!) ===
    doc.openingBalance = totalOpening;
    doc.openingCash = closingCash;
    doc.openingUPI = closingUPI;
    doc.openingCarriedFrom = prevDoc.date;

    await doc.save();

    res.json({ 
      success: true, 
      message: 'Opening balance set successfully',
      data: {
        openingBalance: totalOpening,
        openingCash: closingCash,
        openingUPI: closingUPI,
        from: prevDoc.date
      }
    });
  } catch (err) {
    console.error('setOpeningBalance error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};