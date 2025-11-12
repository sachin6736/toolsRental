import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Package, Search, ChevronLeft, ChevronRight, IndianRupee } from 'lucide-react';
import { PuffLoader } from 'react-spinners';
import { debounce } from 'lodash';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000';

const ViewRentals = () => {
  const [rentals, setRentals] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // New state for status filter
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalRentals: 0, hasMore: false });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch rentals with pagination, search, and status filter
  const fetchRentals = async (page = 1, search = '', status = '') => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({ page, limit: 10, search });
      if (status) queryParams.append('status', status); // Add status to query params
      const response = await fetch(`${API}/Rentals/getrentals?${queryParams}`);
      const { success, data, pagination } = await response.json();
      if (!success) throw new Error('Failed to fetch rentals');
      setRentals(data);
      setPagination(pagination);
    } catch (err) {
      toast.error('Failed to load rentals', { position: 'top-right', autoClose: 3000 });
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced fetch function
  const debouncedFetchRentals = debounce((page, search, status) => {
    fetchRentals(page, search, status);
  }, 300);

  useEffect(() => {
    fetchRentals(1, '', '');
  }, []);

  const handleSearch = (e) => {
    const searchValue = e.target.value;
    setSearch(searchValue);
    setPage(1);
    debouncedFetchRentals(1, searchValue, statusFilter);
  };

  const handleStatusFilter = (e) => {
    const statusValue = e.target.value;
    setStatusFilter(statusValue);
    setPage(1);
    debouncedFetchRentals(1, search, statusValue);
  };

  const handlePageChange = (direction) => {
    const newPage = direction === 'next' ? page + 1 : page - 1;
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPage(newPage);
    fetchRentals(newPage, search, statusFilter);
  };

  // Function to get row background color based on status
  const getRowColor = (status) => {
    switch (status) {
      case 'return completed':
        return 'bg-green-100'; // Light green
      case 'rented':
        return 'bg-red-100'; // Light red
      case 'partial return':
        return 'bg-red-50'; // Even lighter red
      default:
        return 'bg-white';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pl-52 lg:pl-60 pb-8 px-4 sm:px-6 lg:px-8 relative">
      <ToastContainer position="top-right" autoClose={3000} />
      {isLoading && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex justify-center items-center z-50">
          <PuffLoader color="#3b82f6" size={60} aria-label="Loading" />
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center">
            <Package className="h-6 w-6 mr-2 text-blue-600" /> View Rentals
          </h2>
          <button
            onClick={() => navigate('/create-rental')}
            className="py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 text-sm font-semibold"
          >
            Create Rental
          </button>
        </div>
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative max-w-md">
            <label htmlFor="searchRentals" className="block text-sm font-medium text-gray-700 mb-1">
              Search Rentals
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="searchRentals"
                type="text"
                value={search}
                onChange={handleSearch}
                placeholder="Search by user name or tool name"
                className={`w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm bg-white shadow-sm placeholder-gray-400 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="relative max-w-md">
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={handleStatusFilter}
              className={`w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm bg-white shadow-sm ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              <option value="">All Statuses</option>
              <option value="rented">Rented</option>
              <option value="partial return">Partial Return</option>
              <option value="return completed">Return Completed</option>
            </select>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <tr>
                  {[
                    { label: 'User', icon: null },
                    { label: 'Tools', icon: <Package className="h-4 w-4 mr-1" /> },
                    { label: 'Initial Amount', icon: <IndianRupee className="h-4 w-4 mr-1" /> },
                    { label: 'Total Amount', icon: <IndianRupee className="h-4 w-4 mr-1" /> },
                    { label: 'Status', icon: null },
                    { label: 'Created At', icon: null },
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
                {rentals.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center text-gray-500 text-sm font-medium">
                      No rentals found
                    </td>
                  </tr>
                ) : (
                  rentals.map((rental) => (
                    <tr
                      key={rental._id}
                      className={`${getRowColor(rental.status)} hover:bg-blue-50 cursor-pointer transition duration-150 relative group`}
                      onClick={() => navigate(`/track-rental/${rental._id}`)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {rental.user ? `${rental.user.name} (${rental.user.phone})` : 'Unknown User'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        <ul className="list-disc pl-5">
                          {rental.tools.map((tool) => (
                            <li key={tool.tool._id}>
                              {tool.tool.name} ({tool.tool.category}) - {tool.count} x ₹{tool.tool.price}
                              {tool.returnedCount > 0 ? ` (Returned: ${tool.returnedCount})` : ''}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        ₹{rental.initialAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        ₹{rental.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {rental.status}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        {new Date(rental.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        View Details
                      </span>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {(pagination.hasMore || page > 1) && (
            <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 border-t border-gray-200">
              <div className="text-sm text-gray-600 font-medium">
                Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, pagination.totalRentals)} of{' '}
                {pagination.totalRentals} rentals
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange('prev')}
                  disabled={page === 1 || isLoading}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  <ChevronLeft className="h-4 w-4 mr-1 inline" /> Previous
                </button>
                <div className="flex gap-1">
                  {[...Array(Math.min(pagination.totalPages, 5))].map((_, index) => {
                    const pageNum = index + 1;
                    return (
                      <button
                        key={`page-${pageNum}`}
                        onClick={() => {
                          if (!isLoading && page !== pageNum) {
                            setPage(pageNum);
                            fetchRentals(pageNum, search, statusFilter);
                          }
                        }}
                        disabled={isLoading || page === pageNum}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                          page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                        } transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {pagination.totalPages > 5 && (
                    <span className="text-sm text-gray-600 font-medium">...</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handlePageChange('next')}
                  disabled={!pagination.hasMore || isLoading}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1 inline" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewRentals;