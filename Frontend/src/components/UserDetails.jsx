import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { User, Home, Phone, IdCard, Briefcase, ArrowLeft, Package, Calendar, IndianRupee, ChevronDown, ChevronUp, X } from 'lucide-react';
import { PuffLoader } from 'react-spinners';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isCreditHistoryOpen, setIsCreditHistoryOpen] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [repaymentType, setRepaymentType] = useState(null); // 'all' or rentalId
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API}/Users/getuser/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.status}`);
        }
        const { success, data } = await response.json();
        if (!success) {
          throw new Error(data.message || 'Failed to fetch user');
        }
        setUser(data);
      } catch (err) {
        console.error('Fetch error:', err);
        toast.error('Failed to load user details.', {
          position: 'top-right',
          autoClose: 3000,
        });
        navigate('/view');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [id, navigate]);

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const toggleCreditHistory = () => {
    setIsCreditHistoryOpen(!isCreditHistoryOpen);
  };

  const handleRepayAllCredits = () => {
    setRepaymentType('all');
    setShowRepaymentModal(true);
  };

  const handleRepayCredit = (rentalId) => {
    setRepaymentType(rentalId);
    setShowRepaymentModal(true);
  };

  const handleConfirmRepayment = async () => {
    setShowRepaymentModal(false);
    setIsLoading(true);
    try {
      const payload = { paymentMethod };
      if (repaymentType !== 'all') {
        payload.rentalId = repaymentType;
      }
      const response = await fetch(`${API}/Users/repaycredit/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to process repayment');
      }
      toast.success(data.message, { position: 'top-right', autoClose: 2000 });
      setUser(data.user); // Update user data
    } catch (err) {
      toast.error(err.message, { position: 'top-right', autoClose: 3000 });
    } finally {
      setIsLoading(false);
      setRepaymentType(null);
      setPaymentMethod('Cash');
    }
  };

  const handleCloseModal = () => {
    setShowRepaymentModal(false);
    setRepaymentType(null);
    setPaymentMethod('Cash');
  };

  const getReturnDate = (rental) => {
    if (!rental || !rental.tools || !Array.isArray(rental.tools)) {
      return 'N/A';
    }
    if (rental.status !== 'return completed') {
      return 'Ongoing';
    }
    const returnDates = rental.tools.flatMap((tool) =>
      tool.returnDates && Array.isArray(tool.returnDates)
        ? tool.returnDates.map((rd) => new Date(rd.date).getTime())
        : []
    );
    if (returnDates.length === 0) {
      return 'N/A';
    }
    const maxDate = new Date(Math.max(...returnDates));
    return maxDate.toLocaleDateString('en-IN');
  };

  const getToolCount = (rental) => {
    if (!rental || !rental.tools || !Array.isArray(rental.tools)) {
      return 0;
    }
    return rental.tools.reduce((sum, tool) => sum + (tool.count || 0), 0);
  };

  const getTotalDiscount = (rental) => {
    if (!rental || !rental.discounts || !Array.isArray(rental.discounts)) {
      return '0.00';
    }
    return rental.discounts.reduce((sum, discount) => sum + (discount.amount || 0), 0).toFixed(2);
  };

  const getTotalCredit = (rental) => {
    if (!rental || !rental.credits || !Array.isArray(rental.credits)) {
      return '0.00';
    }
    return rental.credits.reduce((sum, credit) => sum + (credit.amount || 0), 0).toFixed(2);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pl-52 lg:pl-60 pb-8 px-4 sm:px-6 lg:px-8 relative">
      <ToastContainer position="top-right" autoClose={3000} />
      {isLoading && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex justify-center items-center z-50">
          <PuffLoader color="#3b82f6" size={60} aria-label="Loading" />
        </div>
      )}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative bg-white rounded-lg p-4 max-w-[90%] max-h-[90%]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
              aria-label="Close image"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={selectedImage}
              alt="Aadhar"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
      {showRepaymentModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <IndianRupee className="h-5 w-5 mr-2 text-blue-600" />
              {repaymentType === 'all' ? 'Repay All Credits' : 'Repay Credit'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {repaymentType === 'all'
                ? `Repay total credit of ₹${(user.totalCredit || 0).toFixed(2)}`
                : `Repay credit of ₹${(user.credits.find(c => c.rentalId.toString() === repaymentType)?.amount || 0).toFixed(2)} for rental ${repaymentType}`}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 focus:outline-none transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRepayment}
                className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
              >
                Confirm Repayment
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/view')}
            className="mr-4 text-blue-600 hover:text-blue-800 transition-colors duration-200"
            aria-label="Back to Users"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center">
            <User className="h-6 w-6 mr-2 text-blue-600" /> {user.name}
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row lg:space-x-6 space-y-6 lg:space-y-0">
          {/* Personal Information */}
          <div className="lg:w-1/2 bg-white rounded-xl shadow-lg p-6 border border-gray-100 transition-all duration-200 hover:shadow-xl">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" /> Personal Information
            </h3>
            <div className="space-y-4 text-gray-700">
              {[
                { label: 'Name', value: user.name || 'N/A', icon: <User className="h-5 w-5 text-blue-600" /> },
                { label: 'Address', value: user.adress || 'N/A', icon: <Home className="h-5 w-5 text-blue-600" /> },
                { label: 'Phone', value: user.phone || 'N/A', icon: <Phone className="h-5 w-5 text-blue-600" /> },
                { label: 'Aadhar', value: user.aadhar || 'N/A', icon: <IdCard className="h-5 w-5 text-blue-600" /> },
                { label: 'Profession', value: user.profession || 'N/A', icon: <Briefcase className="h-5 w-5 text-blue-600" /> },
                {
                  label: 'Aadhar Image',
                  value: user.aadharImage ? (
                    <img
                      src={`${API}${user.aadharImage}`}
                      alt="Aadhar"
                      className="h-12 w-16 object-cover rounded-md cursor-pointer hover:shadow-md transition-shadow duration-150"
                      onClick={() => handleImageClick(`${API}${user.aadharImage}`)}
                    />
                  ) : (
                    'N/A'
                  ),
                  icon: <IdCard className="h-5 w-5 text-blue-600" />,
                },
                {
                  label: 'Total Credit',
                  value: (
                    <div className="flex items-center gap-2">
                      <span>₹{(user.totalCredit || 0).toFixed(2)}</span>
                      {user.totalCredit > 0 && (
                        <button
                          onClick={handleRepayAllCredits}
                          className="px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium transition-colors"
                          disabled={isLoading}
                        >
                          Repay All
                        </button>
                      )}
                    </div>
                  ),
                  icon: <IndianRupee className="h-5 w-5 text-blue-600" />,
                },
              ].map(({ label, value, icon }, index) => (
                <div key={index} className="flex items-center gap-3">
                  {icon}
                  <div>
                    <span className="text-sm font-medium text-gray-800">{label}:</span>
                    <span className="text-sm text-gray-600 ml-2">{value}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Credit History */}
            <div className="mt-6">
              <button
                onClick={toggleCreditHistory}
                className="flex items-center text-blue-600 hover:text-blue-800 font-semibold text-sm transition-colors duration-200"
                disabled={isLoading}
              >
                {isCreditHistoryOpen ? (
                  <ChevronUp className="h-5 w-5 mr-1" />
                ) : (
                  <ChevronDown className="h-5 w-5 mr-1" />
                )}
                Credit History
              </button>
              {isCreditHistoryOpen && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow-inner">
                  {user.credits.length === 0 ? (
                    <p className="text-sm text-gray-500">No credit history available.</p>
                  ) : (
                    <ul className="space-y-3 max-h-60 overflow-y-auto">
                      {user.credits.map((credit, index) => (
                        <li key={index} className="text-sm text-gray-600 bg-white p-3 rounded-md shadow-sm flex justify-between items-center">
                          <span>
                            <span className="font-medium text-gray-800">
                              {new Date(credit.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}:
                            </span>{' '}
                            ₹{credit.amount.toFixed(2)} for rental{' '}
                            <span
                              className="text-blue-600 hover:underline cursor-pointer"
                              onClick={() => navigate(`/track-rental/${credit.rentalId}`)}
                            >
                              {credit.rentalId}
                            </span>
                            {credit.note ? ` - Note: ${credit.note}` : ''}
                          </span>
                          <button
                            onClick={() => handleRepayCredit(credit.rentalId.toString())}
                            className="px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium transition-colors"
                            disabled={isLoading}
                          >
                            Repay
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Order History */}
          <div className="lg:w-1/2 bg-white rounded-xl shadow-lg p-6 border border-gray-100 transition-all duration-200 hover:shadow-xl">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2 text-blue-600" /> Order History
            </h3>
            {user.orderHistory.length === 0 ? (
              <div className="text-center text-gray-500 text-sm font-medium py-6">
                No order history found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <tr>
                      {[
                        { label: 'Rental Date', icon: <Calendar className="h-4 w-4 mr-1" /> },
                        { label: 'Return Date', icon: <Calendar className="h-4 w-4 mr-1" /> },
                        { label: 'Tools', icon: <Package className="h-4 w-4 mr-1" /> },
                        { label: 'Total', icon: <IndianRupee className="h-4 w-4 mr-1" /> },
                        { label: 'Discount', icon: <IndianRupee className="h-4 w-4 mr-1" /> },
                        { label: 'Credit', icon: <IndianRupee className="h-4 w-4 mr-1" /> },
                        { label: 'Action', icon: null },
                      ].map(({ label, icon }, index) => (
                        <th
                          key={index}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                        >
                          <div className="flex items-center">
                            {icon}
                            {label}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {user.orderHistory.map((rental, index) => (
                      <tr
                        key={rental._id}
                        className={`${
                          index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                        } hover:bg-blue-50 transition duration-150`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                          {new Date(rental.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                          {getReturnDate(rental)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                          {getToolCount(rental)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                          ₹{rental.totalAmount ? rental.totalAmount.toFixed(2) : '0.00'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                          ₹{getTotalDiscount(rental)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                          ₹{getTotalCredit(rental)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <button
                            onClick={() => navigate(`/track-rental/${rental._id}`)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-xs font-medium"
                            disabled={isLoading}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;