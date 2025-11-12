import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { User, Wrench, Package, DollarSign, Plus, Minus, X, Search, IndianRupee } from 'lucide-react';
import { PuffLoader } from 'react-spinners';
import { debounce } from 'lodash';

const API = 'http://localhost:5000';

const CreateRental = () => {
  const [users, setUsers] = useState([]);
  const [tools, setTools] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTools, setSelectedTools] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [toolSearch, setToolSearch] = useState('');
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [isToolLoading, setIsToolLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(''); // New state for payment method

  const fetchUsers = async (search = '') => {
    setIsUserLoading(true);
    try {
      const queryParams = new URLSearchParams({ limit: 10 });
      if (search) queryParams.append('search', search);
      const response = await fetch(`${API}/Users/getusers?${queryParams}`);
      const { success, data } = await response.json();
      if (!success) throw new Error('Failed to fetch users');
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load users', { autoClose: 2000 });
    } finally {
      setIsUserLoading(false);
    }
  };

  const fetchTools = async (search = '') => {
    setIsToolLoading(true);
    try {
      const queryParams = new URLSearchParams({ limit: 10 });
      if (search) queryParams.append('search', search);
      const response = await fetch(`${API}/Tools/gettools?${queryParams}`);
      const { success, data } = await response.json();
      if (!success) throw new Error('Failed to fetch tools');
      setTools(data.filter(tool => tool.category === 'Accessories' || tool.count > 0));
    } catch (err) {
      toast.error('Failed to load tools', { autoClose: 2000 });
    } finally {
      setIsToolLoading(false);
    }
  };

  const debouncedFetchUsers = debounce((search) => {
    fetchUsers(search);
  }, 3000);

  const debouncedFetchTools = debounce((search) => {
    fetchTools(search);
  }, 3000);

  useEffect(() => {
    fetchUsers();
    fetchTools();
  }, []);

  const handleUserSearch = (e) => {
    const search = e.target.value;
    setUserSearch(search);
    debouncedFetchUsers(search);
  };

  const handleToolSearch = (e) => {
    const search = e.target.value;
    setToolSearch(search);
    debouncedFetchTools(search);
  };

  const selectUser = (user) => {
    setSelectedUser(user);
  };

  const deselectUser = () => {
    setSelectedUser(null);
  };

  const addTool = (tool) => {
    if (selectedTools.some(t => t.toolId === tool._id)) {
      toast.warn('Tool already added', { autoClose: 2000 });
      return;
    }
    setSelectedTools([...selectedTools, {
      toolId: tool._id,
      name: tool.name,
      count: 1,
      price: tool.price,
      maxCount: tool.category === 'Power Tools' ? tool.count : Infinity,
      category: tool.category, // Store category for payment method logic
    }]);
    updateTotal([...selectedTools, { toolId: tool._id, name: tool.name, count: 1, price: tool.price }]);
  };

  const removeTool = (toolId) => {
    const updated = selectedTools.filter(t => t.toolId !== toolId);
    setSelectedTools(updated);
    updateTotal(updated);
  };

  const updateToolCount = (toolId, delta) => {
    const updated = selectedTools.map(t => {
      if (t.toolId === toolId) {
        const newCount = Math.max(1, Math.min(t.count + delta, t.maxCount));
        return { ...t, count: newCount };
      }
      return t;
    });
    setSelectedTools(updated);
    updateTotal(updated);
  };

  const updateTotal = (toolsList) => {
    const total = toolsList.reduce((sum, t) => sum + t.count * t.price, 0);
    setTotalAmount(total);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUser || selectedTools.length === 0) {
      toast.error('Please select a user and at least one tool', { autoClose: 3000 });
      return;
    }
    setShowNotesModal(true);
  };

  const handleConfirmRental = async () => {
    const hasAccessories = selectedTools.some(t => t.category === 'Accessories');
    if (hasAccessories && !paymentMethod) {
      toast.error('Please select a payment method for accessories', { autoClose: 3000 });
      return;
    }
    setShowNotesModal(false);
    setIsUserLoading(true);
    setIsToolLoading(true);
    try {
      const response = await fetch(`${API}/Rentals/createrental`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser._id,
          tools: selectedTools.map(t => ({ toolId: t.toolId, count: t.count })),
          notes: notes.trim() ? [{ text: notes.trim() }] : [],
          accessoryPaymentMethod: hasAccessories ? paymentMethod : undefined, // Include payment method if accessories
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create rental');
      }
      toast.success('Rental created successfully', { autoClose: 2000 });
      setSelectedUser(null);
      setSelectedTools([]);
      setTotalAmount(0);
      setUserSearch('');
      setToolSearch('');
      setNotes('');
      setPaymentMethod(''); // Reset payment method
      fetchUsers();
      fetchTools();
    } catch (err) {
      toast.error(err.message, { autoClose: 3000 });
    } finally {
      setIsUserLoading(false);
      setIsToolLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowNotesModal(false);
    setNotes('');
    setPaymentMethod(''); // Reset payment method
  };

  const isLoading = isUserLoading || isToolLoading;
  const hasAccessories = selectedTools.some(t => t.category === 'Accessories');

  return (
    <div className="min-h-screen bg-gray-50 pt-16 md:pl-48">
  <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto"></div>
      <ToastContainer />
      {isLoading && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
          <PuffLoader color="#2563eb" size={50} />
        </div>
      )}
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <Package className="h-6 w-6 mr-2 text-blue-600" /> Create Rental
        </h2>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 border border-gray-100 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select User</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={handleUserSearch}
                placeholder="Search users by name or phone"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 transition-colors"
                disabled={isUserLoading}
              />
            </div>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md mb-4 bg-white">
              {users.length === 0 && !isUserLoading ? (
                <div className="px-3 py-2 text-gray-500 text-sm">No users found</div>
              ) : (
                users.map(user => (
                  <div
                    key={user._id}
                    className={`flex justify-between items-center px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors ${
                      selectedUser && selectedUser._id === user._id ? 'bg-blue-100' : ''
                    }`}
                    onClick={() => selectUser(user)}
                  >
                    <span className="text-gray-700">{user.name} ({user.phone})</span>
                    <span className="text-gray-500">Credit: ₹{user.totalCredit || 0}</span>
                  </div>
                ))
              )}
            </div>
            {selectedUser && (
              <div className="bg-gray-50 p-2 rounded-md flex items-center justify-between">
                <span className="text-gray-700">Selected: {selectedUser.name} ({selectedUser.phone})</span>
                <button
                  type="button"
                  onClick={deselectUser}
                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Tools</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={toolSearch}
                onChange={handleToolSearch}
                placeholder="Search tools by name"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 transition-colors"
                disabled={isToolLoading}
              />
            </div>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md mb-4 bg-white">
              {tools.length === 0 && !isToolLoading ? (
                <div className="px-3 py-2 text-gray-500 text-sm">No tools found</div>
              ) : (
                tools.map(tool => (
                  <div
                    key={tool._id}
                    className="flex justify-between items-center px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => addTool(tool)}
                  >
                    <span className="text-gray-700">{tool.name} ({tool.category}) - ₹{tool.price}</span>
                    <span className="text-gray-500">
                      {tool.category === 'Power Tools' ? `Available: ${tool.count}` : 'Unlimited'}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Selected Tools</h3>
              {selectedTools.length === 0 ? (
                <p className="text-sm text-gray-500">No tools selected</p>
              ) : (
                selectedTools.map(tool => (
                  <div key={tool.toolId} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                    <span className="text-gray-700">{tool.name} ({tool.category}) - ₹{tool.price}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateToolCount(tool.toolId, -1)}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        disabled={isLoading}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-gray-700">{tool.count}</span>
                      <button
                        type="button"
                        onClick={() => updateToolCount(tool.toolId, 1)}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        disabled={isLoading}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTool(tool.toolId)}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-lg font-bold text-gray-800">
            <span>Total Amount:</span>
            <span className="flex items-center">
              <IndianRupee className="h-5 w-5 mr-1 text-green-600" />
              ₹{totalAmount.toFixed(2)}
            </span>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Creating...' : 'Create Rental'}
          </button>
        </form>
      </div>
      {showNotesModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2 text-blue-600" /> Add Notes & Payment (Optional)
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes for this rental..."
              className="w-full h-24 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none mb-4"
            />
            {hasAccessories && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method for Accessories</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Payment Method</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 focus:outline-none transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRental}
                disabled={hasAccessories && !paymentMethod}
                className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 transition-colors"
              >
                Confirm Rental
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateRental;