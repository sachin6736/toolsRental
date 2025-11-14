// controllers/dailyTransactionController.js
import DailyTransaction from '../models/dailyTransaction.js';

// ---------------------------------------------------------------------
// Helper – get or create DailyTransaction for a date
// ---------------------------------------------------------------------
const getOrCreate = async (dateStr) => {
  let doc = await DailyTransaction.findOne({ date: dateStr });
  if (!doc) {
    doc = new DailyTransaction({ date: dateStr, transactions: [] });
    await doc.save();
  }
  return doc;
};

// ---------------------------------------------------------------------
// GET – all transactions for a date
// ---------------------------------------------------------------------
export const getDailyTransactions = async (req, res) => {
  try {
    const { date } = req.query;
    const query = date
      ? { date }
      : { date: new Date().toLocaleDateString('en-IN') };

    const docs = await DailyTransaction.find(query)
      .populate('transactions.user', 'name phone')
      .populate('transactions.rentalId', 'tools');

    res.json({ success: true, data: docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---------------------------------------------------------------------
// POST – add a debit entry
// ---------------------------------------------------------------------
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
      return res.status(400).json({ message: 'paymentMethod must be Cash or UPI' });

    if (!category)
      return res.status(400).json({ message: 'Category required for debit' });

    const targetDate = customDate
      ? new Date(customDate).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');

    // ---- Day-closed guard -------------------------------------------------
    const dailyCheck = await DailyTransaction.findOne({ date: targetDate });
    if (dailyCheck?.isClosed) {
      return res.status(400).json({
        success: false,
        message: 'Day is closed. Cannot add debit.',
      });
    }

    // ---- Balance check ----------------------------------------------------
    const daily = await DailyTransaction.findOne({ date: targetDate })
      .select('transactions')
      .lean();

    const balances = { Cash: 0, UPI: 0 };
    if (daily?.transactions) {
      daily.transactions.forEach((tx) => {
        if (tx.type === 'debit') {
          balances[tx.paymentMethod] -= tx.amount;
        } else {
          balances[tx.paymentMethod] += tx.amount;
        }
      });
    }

    if (amount > balances[paymentMethod]) {
      return res.status(400).json({
        success: false,
        message: `Insufficient ${paymentMethod} balance. Available: ₹${balances[
          paymentMethod
        ].toFixed(2)}`,
      });
    }

    // ---- Persist ---------------------------------------------------------
    let doc = await DailyTransaction.findOne({ date: targetDate });
    if (!doc) doc = new DailyTransaction({ date: targetDate, transactions: [] });

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

// ---------------------------------------------------------------------
// POST – internal transfer (Cash ↔ UPI)
// ---------------------------------------------------------------------
export const transferBalance = async (req, res) => {
  try {
    const {
      amount: rawAmount,
      from,
      to,
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

    // ---- Day-closed guard -------------------------------------------------
    const dailyCheck = await DailyTransaction.findOne({ date: targetDate });
    if (dailyCheck?.isClosed) {
      return res.status(400).json({
        success: false,
        message: 'Day is closed. Cannot transfer.',
      });
    }

    // ---- Balance check ----------------------------------------------------
    const daily = await DailyTransaction.findOne({ date: targetDate })
      .select('transactions')
      .lean();

    const balances = { Cash: 0, UPI: 0 };
    if (daily?.transactions) {
      daily.transactions.forEach((tx) => {
        if (tx.type === 'debit') balances[tx.paymentMethod] -= tx.amount;
        else balances[tx.paymentMethod] += tx.amount;
      });
    }

    if (amount > balances[from]) {
      return res.status(400).json({
        success: false,
        message: `Insufficient ${from} balance. Available: ₹${balances[
          from
        ].toFixed(2)}`,
      });
    }

    // ---- Persist ---------------------------------------------------------
    let doc = await DailyTransaction.findOne({ date: targetDate });
    if (!doc) doc = new DailyTransaction({ date: targetDate, transactions: [] });

    const transferNote = notes || `Transferred ₹${amount} from ${from} to ${to}`;

    // Debit source
    doc.transactions.push({
      amount,
      type: 'debit',
      paymentMethod: from,
      category: 'Internal Transfer',
      description: transferNote,
      notes,
    });

    // Credit destination
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

// ---------------------------------------------------------------------
// POST – add a manual credit
// ---------------------------------------------------------------------
export const addCredit = async (req, res) => {
  try {
    const {
      amount: rawAmount,
      paymentMethod,
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

    // ---- Day-closed guard -------------------------------------------------
    const dailyCheck = await DailyTransaction.findOne({ date: targetDate });
    if (dailyCheck?.isClosed) {
      return res.status(400).json({
        success: false,
        message: 'Day is closed. Cannot add credit.',
      });
    }

    let doc = await DailyTransaction.findOne({ date: targetDate });
    if (!doc) doc = new DailyTransaction({ date: targetDate, transactions: [] });

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

// ---------------------------------------------------------------------
// POST – close the day (final & irreversible)
// ---------------------------------------------------------------------
export const closeDay = async (req, res) => {
  try {
    const { date: customDate } = req.body;

    const targetDate = customDate
      ? new Date(customDate).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');

    let doc = await DailyTransaction.findOne({ date: targetDate });
    if (!doc) return res.status(404).json({ message: 'No transactions for this date' });
    if (doc.isClosed) return res.status(400).json({ message: 'Day already closed' });

    const balances = { cashNet: 0, upiNet: 0 };
    doc.transactions.forEach((tx) => {
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
    res.json({ success: true, message: 'Day closed – balance is now final' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---------------------------------------------------------------------
// POST – set opening balance (carries forward from previous closed day)
// ---------------------------------------------------------------------
export const setOpeningBalance = async (req, res) => {
  try {
    const { date: isoDate } = req.body; // e.g., "2025-11-15"

    if (!isoDate) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    // Convert ISO date to DD/MM/YYYY
    const targetDateStr = new Date(isoDate).toLocaleDateString('en-IN');
    console.log("Target Date (DD/MM/YYYY):", targetDateStr);

    let doc = await DailyTransaction.findOne({ date: targetDateStr });
    if (!doc) {
      doc = new DailyTransaction({ date: targetDateStr, transactions: [] });
    }

    // Prevent re-setting
    if (doc.openingBalance > 0) {
      return res.status(400).json({ success: false, message: 'Opening balance already set' });
    }

    // Find previous **closed** day
    let searchDate = new Date(isoDate);
    searchDate.setDate(searchDate.getDate() - 1); // Start from previous day

    let prevDoc = null;
    while (searchDate.getFullYear() > 2020) {
      const prevDateStr = searchDate.toLocaleDateString('en-IN');
      prevDoc = await DailyTransaction.findOne({ date: prevDateStr, isClosed: true });
      if (prevDoc) break;
      searchDate.setDate(searchDate.getDate() - 1);
    }

    if (!prevDoc) {
      return res.status(400).json({ success: false, message: 'No previous closing balance found' });
    }

    const { closingCash, closingUPI } = prevDoc;
    const totalOpening = closingCash + closingUPI;

    if (totalOpening <= 0) {
      return res.status(400).json({ success: false, message: 'Previous closing balance is zero' });
    }

    // Add as credit transactions
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

    // Save opening fields
    doc.openingBalance = totalOpening;
    doc.openingCash = closingCash;
    doc.openingUPI = closingUPI;
    doc.openingCarriedFrom = prevDoc.date;

    await doc.save();
    res.json({ success: true, message: 'Opening balance set successfully' });
  } catch (err) {
    console.error('setOpeningBalance error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};