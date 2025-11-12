import mongoose from 'mongoose';
import Rental from "../models/rental.js";
import User from "../models/user.js";
import Tools from "../models/tools.js";
import DailyTransaction from "../models/dailyTransaction.js";

// Helper function to calculate number of calendar days
const calculateCalendarDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const timeDiff = end - start;
  const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
};

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

// Get list of rentals
export const getRentals = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "" } = req.query;
    const query = {};

    if (search) {
      const userQuery = { name: { $regex: search, $options: "i" } };
      const toolQuery = { name: { $regex: search, $options: "i" } };
      
      const users = await User.find(userQuery).select('_id');
      const tools = await Tools.find(toolQuery).select('_id');
      
      query.$or = [
        { user: { $in: users.map(u => u._id) } },
        { "tools.tool": { $in: tools.map(t => t._id) } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const rentals = await Rental.find(query)
      .populate('user', 'name phone')
      .populate('tools.tool', 'name category price')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const totalRentals = await Rental.countDocuments(query);
    const totalPages = Math.ceil(totalRentals / limit);

    res.status(200).json({
      success: true,
      data: rentals,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRentals,
        hasMore: page * limit < totalRentals,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create a new rental
export const createRental = async (req, res) => {
  try {
    const { userId, tools, notes = [], accessoryPaymentMethod } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Valid User ID is required" });
    }

    if (!tools || !Array.isArray(tools) || tools.length === 0) {
      return res.status(400).json({ message: "Tools array is required and must not be empty" });
    }

    if (!Array.isArray(notes)) {
      return res.status(400).json({ message: "Notes must be an array" });
    }

    for (const note of notes) {
      if (!note.text || typeof note.text !== 'string' || note.text.trim() === '') {
        return res.status(400).json({ message: "Each note must have a valid non-empty text" });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let initialAmount = 0;
    let totalAmount = 0;
    let accessoryAmount = 0;
    const rentalTools = [];
    const toolDetails = [];
    const accessoryDetails = [];

    for (const item of tools) {
      const { toolId, count } = item;

      if (!toolId || !mongoose.Types.ObjectId.isValid(toolId) || !count || isNaN(count) || count < 1) {
        return res.status(400).json({ message: "Each tool must have a valid ID and count >= 1" });
      }

      const tool = await Tools.findById(toolId);
      if (!tool) {
        return res.status(404).json({ message: `Tool with ID ${toolId} not found` });
      }

      if (tool.category === 'Power Tools') {
        if (tool.count < count) {
          return res.status(400).json({ message: `Insufficient count for tool: ${tool.name}. Available: ${tool.count}` });
        }
        tool.count -= count;
        await tool.save();
      }

      const itemTotal = count * tool.price;
      initialAmount += itemTotal;
      if (tool.category === 'Accessories') {
        totalAmount += itemTotal;
        accessoryAmount += itemTotal; // Track accessory amount
        accessoryDetails.push(`${count} unit(s) of ${tool.name}`);
      } else {
        totalAmount += itemTotal * calculateCalendarDays(new Date(), new Date());
      }
      rentalTools.push({
        tool: toolId,
        count: parseInt(count),
        returnedCount: 0,
        price: tool.price,
        rentalDate: new Date(),
        returnDates: [],
      });
      toolDetails.push(`${count} unit(s) of ${tool.name}${tool.category === 'Accessories' ? ' (Purchased)' : ''}`);
    }

    if (accessoryAmount > 0 && !['Cash', 'UPI'].includes(accessoryPaymentMethod)) {
      return res.status(400).json({ message: "Payment method for accessories must be 'Cash' or 'UPI'" });
    }

    const defaultNoteText = `Rental created for user ${user.name} with ${tools.length} item(s): ${toolDetails.join(', ')}. Initial Amount: ₹${initialAmount.toFixed(2)}`;
    const rentalNotes = [{ text: defaultNoteText }, ...notes];

    // Record accessory purchase in DailyTransaction if applicable
    if (accessoryAmount > 0) {
      const dateStr = new Date().toLocaleDateString('en-IN');
      const dailyTransaction = await getOrCreateDailyTransaction(dateStr);
      dailyTransaction.transactions.push({
        rentalId: null, // Set later after rental is saved
        user: userId,
        amount: accessoryAmount,
        type: 'accessory_purchase',
        paymentMethod: accessoryPaymentMethod,
        description: `Accessory purchase for user ${user.name} (Rental created): ${accessoryDetails.join(', ')}, Amount: ₹${accessoryAmount.toFixed(2)} via ${accessoryPaymentMethod}`,
      });
      const newRental = new Rental({
        user: userId,
        tools: rentalTools,
        initialAmount,
        totalAmount,
        status: 'rented',
        notes: rentalNotes,
      });
      await newRental.save();
      // Update rentalId in the transaction
      dailyTransaction.transactions[dailyTransaction.transactions.length - 1].rentalId = newRental._id;
      await dailyTransaction.save();
      user.orderHistory.push(newRental._id);
      await user.save();
      res.status(201).json({ message: "Rental created successfully", rental: newRental });
    } else {
      const newRental = new Rental({
        user: userId,
        tools: rentalTools,
        initialAmount,
        totalAmount,
        status: 'rented',
        notes: rentalNotes,
      });
      await newRental.save();
      user.orderHistory.push(newRental._id);
      await user.save();
      res.status(201).json({ message: "Rental created successfully", rental: newRental });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a single rental for tracking
export const trackRental = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Valid Rental ID is required" });
    }

    const rental = await Rental.findById(id)
      .populate('user', 'name phone totalCredit')
      .populate('tools.tool', 'name category price');

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    let remainingAmount = 0;
    rental.tools.forEach(tool => {
      if (tool.tool.category !== 'Accessories') {
        const unreturnedCount = tool.count - tool.returnedCount;
        if (unreturnedCount > 0) {
          const days = calculateCalendarDays(tool.rentalDate, new Date());
          remainingAmount += unreturnedCount * tool.price * days;
        }
      }
    });

    const totalDiscount = rental.discounts.reduce((sum, d) => sum + d.amount, 0);
    const totalCredit = rental.credits.reduce((sum, c) => sum + c.amount, 0);

    res.status(200).json({
      success: true,
      data: rental,
      remainingAmount,
      totalDiscount,
      totalCredit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark a tool as returned
export const markReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { toolId, count, returnDate, discount = 0, credit = 0, note = '', paymentMethod } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Valid Rental ID is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(toolId)) {
      return res.status(400).json({ message: "Valid Tool ID is required" });
    }
    if (!count || isNaN(count) || count < 1) {
      return res.status(400).json({ message: "Valid count >= 1 is required" });
    }
    if (isNaN(discount) || discount < 0) {
      return res.status(400).json({ message: "Discount must be a non-negative number" });
    }
    if (isNaN(credit) || credit < 0) {
      return res.status(400).json({ message: "Credit must be a non-negative number" });
    }
    if (!['Cash', 'UPI'].includes(paymentMethod)) {
      return res.status(400).json({ message: "Payment method must be 'Cash' or 'UPI'" });
    }
    const parsedReturnDate = returnDate ? new Date(returnDate) : new Date();
    if (isNaN(parsedReturnDate) || parsedReturnDate > new Date()) {
      return res.status(400).json({ message: "Valid return date is required and cannot be in the future" });
    }

    const rental = await Rental.findById(id).populate('tools.tool', 'name category price');
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    const toolEntry = rental.tools.find(t => t.tool._id.toString() === toolId);
    if (!toolEntry) {
      return res.status(404).json({ message: "Tool not found in rental" });
    }

    if (toolEntry.tool.category === 'Accessories') {
      return res.status(400).json({ message: "Accessories are non-returnable" });
    }

    const remainingCount = toolEntry.count - toolEntry.returnedCount;
    if (count > remainingCount) {
      return res.status(400).json({ message: `Cannot return ${count} units; only ${remainingCount} remaining` });
    }

    const daysRented = calculateCalendarDays(toolEntry.rentalDate, parsedReturnDate);
    const charge = count * toolEntry.price * daysRented;
    if (discount + credit > charge) {
      return res.status(400).json({ message: `Discount (₹${discount}) + Credit (₹${credit}) cannot exceed charge (₹${charge})` });
    }

    toolEntry.returnedCount += count;
    toolEntry.returnDates.push({ count, date: parsedReturnDate });

    if (discount > 0) {
      rental.discounts.push({
        toolId,
        amount: discount,
        returnDate: parsedReturnDate,
        note: note || 'Discount applied on return',
      });
    }

    if (credit > 0) {
      rental.credits.push({
        toolId,
        amount: credit,
        returnDate: parsedReturnDate,
        note: note || 'Credit applied on return',
      });
    }

    const user = await User.findById(rental.user);
    if (credit > 0) {
      user.credits.push({
        rentalId: id,
        amount: credit,
        note: note || `Credit for rental of ${toolEntry.tool.name}`,
      });
      user.totalCredit = (user.totalCredit || 0) + credit;
      await user.save();
    }

    const returnNote = `Returned ${count} unit(s) of ${toolEntry.tool.name} on ${parsedReturnDate.toLocaleDateString('en-IN')}. Charge: ₹${charge.toFixed(2)}, Payment Method: ${paymentMethod}${discount > 0 ? `, Discount: ₹${discount.toFixed(2)}` : ''}${credit > 0 ? `, Credit: ₹${credit.toFixed(2)}` : ''}${note ? `, Note: ${note}` : ''}`;
    rental.notes.push({ text: returnNote });

    // Record transaction in DailyTransaction
    const dateStr = parsedReturnDate.toLocaleDateString('en-IN');
    const netAmount = charge - discount - credit;
    if (netAmount > 0) {
      const dailyTransaction = await getOrCreateDailyTransaction(dateStr);
      dailyTransaction.transactions.push({
        rentalId: id,
        user: rental.user,
        amount: netAmount,
        type: 'return',
        paymentMethod,
        description: returnNote,
      });
      await dailyTransaction.save();
    }

    let totalAmount = 0;
    for (const t of rental.tools) {
      const toolPrice = t.price;
      const rentalDate = t.rentalDate;
      let toolTotal = 0;

      const unreturnedCount = t.count - t.returnedCount;
      if (unreturnedCount > 0) {
        if (t.tool.category === 'Accessories') {
          toolTotal += unreturnedCount * toolPrice;
        } else {
          const daysRented = calculateCalendarDays(rentalDate, new Date());
          toolTotal += unreturnedCount * toolPrice * daysRented;
        }
      }

      for (const returnEntry of t.returnDates) {
        if (t.tool.category === 'Accessories') {
          toolTotal += returnEntry.count * toolPrice;
        } else {
          const daysRented = calculateCalendarDays(rentalDate, returnEntry.date);
          toolTotal += returnEntry.count * toolPrice * daysRented;
        }
      }

      totalAmount += toolTotal;
    }

    const totalDiscount = rental.discounts.reduce((sum, d) => sum + d.amount, 0);
    const totalCredit = rental.credits.reduce((sum, c) => sum + c.amount, 0);
    totalAmount -= (totalDiscount + totalCredit);

    const allToolsReturned = rental.tools.every(t => t.returnedCount === t.count || t.tool.category === 'Accessories');
    const someToolsReturned = rental.tools.some(t => t.returnedCount > 0 && t.tool.category !== 'Accessories');
    rental.status = allToolsReturned ? 'return completed' : someToolsReturned ? 'partial return' : 'rented';
    rental.totalAmount = totalAmount;

    const tool = await Tools.findById(toolId);
    if (tool && tool.category === 'Power Tools') {
      tool.count += count;
      await tool.save();
    }

    await rental.save();

    let remainingAmount = 0;
    for (const t of rental.tools) {
      if (t.tool.category !== 'Accessories') {
        const unreturnedCount = t.count - t.returnedCount;
        if (unreturnedCount > 0) {
          const daysRented = calculateCalendarDays(t.rentalDate, new Date());
          remainingAmount += unreturnedCount * t.price * daysRented;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Return marked successfully",
      rental,
      remainingAmount,
      totalDiscount,
      totalCredit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Mark all tools as returned
export const markAllReturned = async (req, res) => {
  try {
    const { id } = req.params;
    const { returnDate = new Date(), discount = 0, credit = 0, note = '', paymentMethod } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Valid Rental ID is required" });
    }
    if (isNaN(discount) || discount < 0) {
      return res.status(400).json({ message: "Discount must be a non-negative number" });
    }
    if (isNaN(credit) || credit < 0) {
      return res.status(400).json({ message: "Credit must be a non-negative number" });
    }
    if (!['Cash', 'UPI'].includes(paymentMethod)) {
      return res.status(400).json({ message: "Payment method must be 'Cash' or 'UPI'" });
    }
    const parsedReturnDate = new Date(returnDate);
    if (isNaN(parsedReturnDate) || parsedReturnDate > new Date()) {
      return res.status(400).json({ message: "Valid return date is required and cannot be in the future" });
    }

    const rental = await Rental.findById(id).populate('tools.tool', 'name category price');
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    let totalCharge = 0;
    const returnNotes = [];
    const toolDetails = [];

    for (const toolEntry of rental.tools) {
      if (toolEntry.tool.category === 'Accessories') {
        continue;
      }

      const remainingCount = toolEntry.count - toolEntry.returnedCount;
      if (remainingCount <= 0) {
        continue;
      }

      const daysRented = calculateCalendarDays(toolEntry.rentalDate, parsedReturnDate);
      const charge = remainingCount * toolEntry.price * daysRented;
      totalCharge += charge;

      toolEntry.returnedCount = toolEntry.count;
      toolEntry.returnDates.push({ count: remainingCount, date: parsedReturnDate });

      toolDetails.push(`${remainingCount} unit(s) of ${toolEntry.tool.name}`);
      returnNotes.push(`Returned ${remainingCount} unit(s) of ${toolEntry.tool.name} on ${parsedReturnDate.toLocaleDateString('en-IN')}. Charge: ₹${charge.toFixed(2)}, Payment Method: ${paymentMethod}`);

      const tool = await Tools.findById(toolEntry.tool._id);
      if (tool && tool.category === 'Power Tools') {
        tool.count += remainingCount;
        await tool.save();
      }
    }

    if (returnNotes.length === 0) {
      return res.status(400).json({ message: "No returnable tools left to mark as returned" });
    }

    if (discount > 0) {
      if (discount > totalCharge) {
        return res.status(400).json({ message: `Discount (₹${discount}) cannot exceed total charge (₹${totalCharge})` });
      }
      rental.discounts.push({
        amount: discount,
        returnDate: parsedReturnDate,
        note: note || 'Discount applied for marking all tools returned',
      });
    }

    if (credit > 0) {
      if (discount + credit > totalCharge) {
        return res.status(400).json({ message: `Discount (₹${discount}) + Credit (₹${credit}) cannot exceed total charge (₹${totalCharge})` });
      }
      rental.credits.push({
        amount: credit,
        returnDate: parsedReturnDate,
        note: note || 'Credit applied for marking all tools returned',
      });

      const user = await User.findById(rental.user);
      user.credits.push({
        rentalId: id,
        amount: credit,
        note: note || 'Credit for marking all tools returned',
      });
      user.totalCredit = (user.totalCredit || 0) + credit;
      await user.save();
    }

    // Record transaction in DailyTransaction
    const dateStr = parsedReturnDate.toLocaleDateString('en-IN');
    const netAmount = totalCharge - discount - credit;
    if (netAmount > 0) {
      const dailyTransaction = await getOrCreateDailyTransaction(dateStr);
      dailyTransaction.transactions.push({
        rentalId: id,
        user: rental.user,
        amount: netAmount,
        type: 'return',
        paymentMethod,
        description: `Returned ${toolDetails.join(', ')} on ${dateStr}. Total Charge: ₹${totalCharge.toFixed(2)}${discount > 0 ? `, Discount: ₹${discount.toFixed(2)}` : ''}${credit > 0 ? `, Credit: ₹${credit.toFixed(2)}` : ''}${note ? `, Note: ${note}` : ''}`,
      });
      await dailyTransaction.save();
    }

    returnNotes.forEach(text => rental.notes.push({ text }));
    if (discount > 0 || credit > 0) {
      const noteText = `Applied ${discount > 0 ? `₹${discount.toFixed(2)} discount` : ''}${discount > 0 && credit > 0 ? ' and ' : ''}${credit > 0 ? `₹${credit.toFixed(2)} credit` : ''} on marking all tools returned: ${toolDetails.join(', ')}, Payment Method: ${paymentMethod}${note ? `, Note: ${note}` : ''}`;
      rental.notes.push({ text: noteText });
    }

    let totalAmount = 0;
    for (const t of rental.tools) {
      const toolPrice = t.price;
      const rentalDate = t.rentalDate;
      let toolTotal = 0;

      const unreturnedCount = t.count - t.returnedCount;
      if (unreturnedCount > 0) {
        if (t.tool.category === 'Accessories') {
          toolTotal += unreturnedCount * toolPrice;
        } else {
          const daysRented = calculateCalendarDays(rentalDate, new Date());
          toolTotal += unreturnedCount * toolPrice * daysRented;
        }
      }

      for (const returnEntry of t.returnDates) {
        if (t.tool.category === 'Accessories') {
          toolTotal += returnEntry.count * toolPrice;
        } else {
          const daysRented = calculateCalendarDays(rentalDate, returnEntry.date);
          toolTotal += returnEntry.count * toolPrice * daysRented;
        }
      }

      totalAmount += toolTotal;
    }

    const totalDiscount = rental.discounts.reduce((sum, d) => sum + d.amount, 0);
    const totalCredit = rental.credits.reduce((sum, c) => sum + c.amount, 0);
    totalAmount -= (totalDiscount + totalCredit);

    const allToolsReturned = rental.tools.every(t => t.returnedCount === t.count || t.tool.category === 'Accessories');
    const someToolsReturned = rental.tools.some(t => t.returnedCount > 0 && t.tool.category !== 'Accessories');
    rental.status = allToolsReturned ? 'return completed' : someToolsReturned ? 'partial return' : 'rented';
    rental.totalAmount = totalAmount;

    await rental.save();

    let remainingAmount = 0;
    for (const t of rental.tools) {
      if (t.tool.category !== 'Accessories') {
        const unreturnedCount = t.count - t.returnedCount;
        if (unreturnedCount > 0) {
          const daysRented = calculateCalendarDays(t.rentalDate, new Date());
          remainingAmount += unreturnedCount * t.price * daysRented;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "All returnable tools marked as returned",
      rental,
      remainingAmount,
      totalDiscount,
      totalCredit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get daily transactions
export const getDailyTransactions = async (req, res) => {
  try {
    const { date } = req.query;
    let query = {};
    if (date) {
      query.date = date;
    } else {
      query.date = new Date().toLocaleDateString('en-IN');
    }

    const transactions = await DailyTransaction.find(query)
      .populate('transactions.user', 'name phone')
      .populate('transactions.rentalId', 'tools');

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};