import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Package, ArrowLeft, CheckCircle, X, IndianRupee } from 'lucide-react';
import { PuffLoader } from 'react-spinners';
import { useParams, useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const API = 'http://localhost:5000';

// Helper function to calculate number of calendar days
const calculateCalendarDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const timeDiff = end - start;
  const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
  return Math.max(1, days);
};

const TrackRental = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rental, setRental] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [returnCounts, setReturnCounts] = useState({});
  const [returnDates, setReturnDates] = useState({});
  const [chargeableAmounts, setChargeableAmounts] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [credit, setCredit] = useState(0);
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [allReturnModalOpen, setAllReturnModalOpen] = useState(false);
  const [allReturnDate, setAllReturnDate] = useState(new Date());
  const [allReturnDiscount, setAllReturnDiscount] = useState(0);
  const [allReturnCredit, setAllReturnCredit] = useState(0);
  const [allReturnNote, setAllReturnNote] = useState('');
  const [allReturnPaymentMethod, setAllReturnPaymentMethod] = useState('Cash');
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);

  const fetchRental = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API}/Rentals/track/${id}`);
      const { success, data, remainingAmount, totalDiscount, totalCredit } = await response.json();
      if (!success) throw new Error('Failed to fetch rental');
      setRental(data);
      setTotalDiscount(totalDiscount || 0);
      setTotalCredit(totalCredit || 0);
      const initialCounts = {};
      const initialDates = {};
      data.tools.forEach((tool) => {
        if (tool.tool.category !== 'Accessories') {
          initialCounts[tool.tool._id] = 1;
          initialDates[tool.tool._id] = new Date();
        }
      });
      setReturnCounts(initialCounts);
      setReturnDates(initialDates);
    } catch (err) {
      toast.error('Failed to load rental', { position: 'top-right', autoClose: 3000 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRental();
  }, [id]);

  const calculateChargeableAmount = (tool, count, returnDate) => {
    if (tool.tool.category === 'Accessories') {
      return count * tool.price;
    }
    const days = calculateCalendarDays(tool.rentalDate, returnDate);
    return count * tool.price * days;
  };

  const calculateAllChargeableAmount = () => {
    if (!rental) return 0;
    let total = 0;
    rental.tools.forEach((tool) => {
      if (tool.tool.category !== 'Accessories' && tool.count > tool.returnedCount) {
        const remainingCount = tool.count - tool.returnedCount;
        total += calculateChargeableAmount(tool, remainingCount, allReturnDate);
      }
    });
    return total;
  };

  const calculateRemainingAmount = () => {
    if (!rental) return 0;
    let remaining = 0;
    rental.tools.forEach((tool) => {
      if (tool.tool.category !== 'Accessories') {
        const unreturnedCount = tool.count - tool.returnedCount;
        if (unreturnedCount > 0) {
          const days = calculateCalendarDays(tool.rentalDate, new Date());
          remaining += unreturnedCount * tool.price * days;
        }
      }
    });
    return remaining;
  };

  const handleCountChange = (toolId, value) => {
    const count = Math.max(1, parseInt(value) || 1);
    setReturnCounts({ ...returnCounts, [toolId]: count });
    if (rental) {
      const tool = rental.tools.find((t) => t.tool._id === toolId);
      if (tool) {
        const amount = calculateChargeableAmount(tool, count, returnDates[toolId] || new Date());
        setChargeableAmounts({ ...chargeableAmounts, [toolId]: amount });
      }
    }
  };

  const handleDateChange = (toolId, date) => {
    setReturnDates({ ...returnDates, [toolId]: date });
    if (rental) {
      const tool = rental.tools.find((t) => t.tool._id === toolId);
      if (tool) {
        const count = returnCounts[toolId] || 1;
        const amount = calculateChargeableAmount(tool, count, date);
        setChargeableAmounts({ ...chargeableAmounts, [toolId]: amount });
      }
    }
  };

  const openModal = (toolId) => {
    setSelectedToolId(toolId);
    setDiscount(0);
    setCredit(0);
    setNote('');
    setPaymentMethod('Cash');
    setModalOpen(true);
  };

  const openAllReturnModal = () => {
    setAllReturnDate(new Date());
    setAllReturnDiscount(0);
    setAllReturnCredit(0);
    setAllReturnNote('');
    setAllReturnPaymentMethod('Cash');
    setAllReturnModalOpen(true);
  };

  const handleMarkReturn = async () => {
    setIsLoading(true);
    try {
      const count = parseInt(returnCounts[selectedToolId] || 1);
      const returnDate = returnDates[selectedToolId] || new Date();
      const charge = calculateChargeableAmount(
        rental.tools.find((t) => t.tool._id === selectedToolId),
        count,
        returnDate
      );
      if (returnDate > new Date()) {
        throw new Error('Return date cannot be in the future');
      }
      if (discount + credit > charge) {
        throw new Error('Discount + Credit cannot exceed chargeable amount');
      }
      const response = await fetch(`${API}/Rentals/mark-return/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId: selectedToolId, count, returnDate, discount, credit, note, paymentMethod }),
      });
      const { success, message, rental: updatedRental, totalDiscount, totalCredit } = await response.json();
      if (!success) throw new Error(message || 'Failed to mark return');
      setRental(updatedRental);
      setTotalDiscount(totalDiscount || 0);
      setTotalCredit(totalCredit || 0);
      setChargeableAmounts({ ...chargeableAmounts, [selectedToolId]: undefined });
      setModalOpen(false);
      toast.success('Return marked successfully', { position: 'top-right', autoClose: 2000 });
    } catch (err) {
      toast.error(err.message, { position: 'top-right', autoClose: 3000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAllReturn = async () => {
    setIsLoading(true);
    try {
      const charge = calculateAllChargeableAmount();
      if (allReturnDate > new Date()) {
        throw new Error('Return date cannot be in the future');
      }
      if (allReturnDiscount + allReturnCredit > charge) {
        throw new Error('Discount + Credit cannot exceed total chargeable amount');
      }
      const response = await fetch(`${API}/Rentals/mark-all-returned/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnDate: allReturnDate,
          discount: allReturnDiscount,
          credit: allReturnCredit,
          note: allReturnNote,
          paymentMethod: allReturnPaymentMethod,
        }),
      });
      const { success, message, rental: updatedRental, totalDiscount, totalCredit } = await response.json();
      if (!success) throw new Error(message || 'Failed to mark all returns');
      setRental(updatedRental);
      setTotalDiscount(totalDiscount || 0);
      setTotalCredit(totalCredit || 0);
      setAllReturnModalOpen(false);
      toast.success('All returnable tools marked as returned', { position: 'top-right', autoClose: 2000 });
    } catch (err) {
      toast.error(err.message, { position: 'top-right', autoClose: 3000 });
    } finally {
      setIsLoading(false);
    }
  };

  const hasReturnableTools = () => {
    return rental?.tools.some((tool) => tool.tool.category !== 'Accessories' && tool.count > tool.returnedCount);
  };

  if (!rental) return null;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pl-52 lg:pl-60 pb-8 px-4 sm:px-6 lg:px-8 relative">
      <ToastContainer position="top-right" autoClose={3000} />
      {isLoading && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex justify-center items-center z-50">
          <PuffLoader color="#3b82f6" size={60} aria-label="Loading" />
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/view-rentals')}
            className="mr-4 text-blue-600 hover:text-blue-800 transition-colors duration-200 relative group"
            aria-label="Back to Rentals"
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              Back to Rentals
            </span>
          </button>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center">
            <Package className="h-6 w-6 mr-2 text-blue-600" /> Track Rental
          </h2>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:space-x-6 mb-8 gap-6">
            <div className="flex-1 bg-gray-50 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2 text-blue-600" /> Rental Details
              </h3>
              <div className="space-y-3 text-gray-700 text-sm">
                <p>
                  <strong>User:</strong>{' '}
                  {rental.user ? (
                    <span className="text-blue-600 hover:underline cursor-pointer" onClick={() => navigate(`/user/${rental.user._id}`)}>
                      {rental.user.name} ({rental.user.phone})
                    </span>
                  ) : (
                    'Unknown User'
                  )}
                </p>
                <p>
                  <strong>User's Total Credit:</strong>{' '}
                  <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                    <IndianRupee className="h-4 w-4 inline mr-1" />
                    {rental.user?.totalCredit?.toFixed(2) || '0.00'}
                  </span>
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      rental.status === 'rented'
                        ? 'bg-yellow-100 text-yellow-800'
                        : rental.status === 'partial return'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {rental.status}
                  </span>
                </p>
                <p>
                  <strong>Initial Amount:</strong> ₹{rental.initialAmount.toFixed(2)}
                </p>
                <p>
                  <strong>Total Discount:</strong> ₹{totalDiscount.toFixed(2)}
                </p>
                <p>
                  <strong>Total Credit (Rental):</strong> ₹{totalCredit.toFixed(2)}
                </p>
                
                <p>
                  <strong>Total Amount:</strong> ₹{rental.totalAmount.toFixed(2)}
                </p>
                <p>
                  <strong>Remaining Amount:</strong> ₹{calculateRemainingAmount().toFixed(2)}
                </p>
                <p>
                  <strong>Created At:</strong>{' '}
                  {new Date(rental.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <div className="flex-1 bg-gray-50 p-6 rounded-lg shadow-sm max-h-96 overflow-y-auto">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2 text-blue-600" /> Notes History
              </h3>
              {rental.notes.length > 0 ? (
                <ul className="space-y-3">
                  {rental.notes.map((note, index) => (
                    <li key={index} className="text-sm text-gray-600 bg-white p-3 rounded-md shadow-sm">
                      <span className="font-medium text-gray-800">
                        {new Date(note.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        :
                      </span>{' '}
                      {note.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No notes available</p>
              )}
            </div>
          </div>
          {hasReturnableTools() && (
            <div className="mb-6">
              <button
                onClick={openAllReturnModal}
                className="relative group px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold flex items-center"
                disabled={isLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" /> Mark All Returnable Items as Returned
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  Return all remaining returnable tools
                </span>
              </button>
            </div>
          )}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2 text-blue-600" /> Tools
            </h3>
            <div className="space-y-4">
              {rental.tools.map((tool) => (
                <div
                  key={tool.tool._id}
                  className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50 p-4 rounded-lg shadow-sm"
                >
                  <div className="mb-4 md:mb-0">
                    <p className="text-gray-800 font-medium">{tool.tool.name} ({tool.tool.category})</p>
                    <p className="text-sm text-gray-600">
                      {tool.tool.category === 'Accessories'
                        ? `Purchased: ${tool.count}`
                        : `Rented: ${tool.count} | Returned: ${tool.returnedCount} | Remaining: ${tool.count - tool.returnedCount}`}
                    </p>
                    {tool.tool.category !== 'Accessories' && tool.returnDates.length > 0 && (
                      <ul className="text-sm text-gray-600 list-disc pl-5 mt-2">
                        {tool.returnDates.map((rd, index) => (
                          <li key={index}>
                            Returned {rd.count} on{' '}
                            {new Date(rd.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {tool.tool.category !== 'Accessories' && tool.count > tool.returnedCount && (
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max={tool.count - tool.returnedCount}
                        value={returnCounts[tool.tool._id] || 1}
                        onChange={(e) => handleCountChange(tool.tool._id, e.target.value)}
                        className="w-20 p-2 border border-gray-200 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading}
                      />
                      <DatePicker
                        selected={returnDates[tool.tool._id] || new Date()}
                        onChange={(date) => handleDateChange(tool.tool._id, date)}
                        maxDate={new Date()}
                        dateFormat="dd/MM/yyyy"
                        className="w-36 p-2 border border-gray-200 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading}
                      />
                      <div className="text-sm text-gray-700 flex items-center">
                        <IndianRupee className="h-4 w-4 mr-1" />
                        {(chargeableAmounts[tool.tool._id] ||
                          calculateChargeableAmount(
                            tool,
                            returnCounts[tool.tool._id] || 1,
                            returnDates[tool.tool._id] || new Date()
                          )).toFixed(2)}
                      </div>
                      <button
                        onClick={() => openModal(tool.tool._id)}
                        className="relative group px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold flex items-center"
                        disabled={isLoading}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" /> Mark Return
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                          Mark this tool as returned
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <IndianRupee className="h-5 w-5 mr-2 text-blue-600" /> Discounts Applied
            </h3>
            {rental.discounts.length > 0 ? (
              <ul className="space-y-3">
                {rental.discounts.map((discount, index) => (
                  <li key={index} className="text-sm text-gray-600 bg-white p-3 rounded-md shadow-sm">
                    <span className="font-medium text-gray-800">
                      {new Date(discount.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      :
                    </span>{' '}
                    ₹{discount.amount.toFixed(2)} discount on{' '}
                    {discount.toolId
                      ? rental.tools.find((t) => t.tool._id.toString() === discount.toolId.toString())?.tool.name ||
                        'Tool'
                      : 'All Tools'}{' '}
                    (Return on {new Date(discount.returnDate).toLocaleDateString('en-IN')})
                    {discount.note ? ` - Note: ${discount.note}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No discounts applied</p>
            )}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <IndianRupee className="h-5 w-5 mr-2 text-blue-600" /> Credits Applied
            </h3>
            {rental.credits.length > 0 ? (
              <ul className="space-y-3">
                {rental.credits.map((credit, index) => (
                  <li key={index} className="text-sm text-gray-600 bg-white p-3 rounded-md shadow-sm">
                    <span className="font-medium text-gray-800">
                      {new Date(credit.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      :
                    </span>{' '}
                    ₹{credit.amount.toFixed(2)} credit on{' '}
                    {credit.toolId
                      ? rental.tools.find((t) => t.tool._id.toString() === credit.toolId.toString())?.tool.name ||
                        'Tool'
                      : 'All Tools'}{' '}
                    (Return on {new Date(credit.returnDate).toLocaleDateString('en-IN')})
                    {credit.note ? ` - Note: ${credit.note}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No credits applied</p>
            )}
          </div>
        </div>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" /> Mark Return
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={credit}
                  onChange={(e) => setCredit(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  rows="4"
                  disabled={isLoading}
                />
              </div>
              <div className="text-sm text-gray-700 flex items-center">
                <IndianRupee className="h-4 w-4 mr-1" />
                {(chargeableAmounts[selectedToolId] ||
                  calculateChargeableAmount(
                    rental.tools.find((t) => t.tool._id === selectedToolId),
                    returnCounts[selectedToolId] || 1,
                    returnDates[selectedToolId] || new Date()
                  )).toFixed(2)}
              </div>
              <div className="text-sm text-gray-700 flex items-center">
                After Discount & Credit:{' '}
                <IndianRupee className="h-4 w-4 mx-1" />
                {(
                  (chargeableAmounts[selectedToolId] ||
                    calculateChargeableAmount(
                      rental.tools.find((t) => t.tool._id === selectedToolId),
                      returnCounts[selectedToolId] || 1,
                      returnDates[selectedToolId] || new Date()
                    )) - discount - credit
                ).toFixed(2)}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkReturn}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold flex items-center"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <PuffLoader color="#fff" size={20} className="mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Confirm Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {allReturnModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-blue-600" /> Mark All Tools as Returned
              </h3>
              <button
                onClick={() => setAllReturnModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Return Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  selected={allReturnDate}
                  onChange={(date) => setAllReturnDate(date)}
                  maxDate={new Date()}
                  dateFormat="dd/MM/yyyy"
                  className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={allReturnDiscount}
                  onChange={(e) => setAllReturnDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={allReturnCredit}
                  onChange={(e) => setAllReturnCredit(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={allReturnPaymentMethod}
                  onChange={(e) => setAllReturnPaymentMethod(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={allReturnNote}
                  onChange={(e) => setAllReturnNote(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  rows="4"
                  disabled={isLoading}
                />
              </div>
              <div className="text-sm text-gray-700 flex items-center">
                Total Charge: <IndianRupee className="h-4 w-4 mx-1" />
                {calculateAllChargeableAmount().toFixed(2)}
              </div>
              <div className="text-sm text-gray-700 flex items-center">
                After Discount & Credit: <IndianRupee className="h-4 w-4 mx-1" />
                {(calculateAllChargeableAmount() - allReturnDiscount - allReturnCredit).toFixed(2)}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setAllReturnModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkAllReturn}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold flex items-center"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <PuffLoader color="#fff" size={20} className="mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Confirm All Returns
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackRental;