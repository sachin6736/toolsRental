import React, { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Search, User, Phone, IdCard, Briefcase, Pencil, X, Home, IndianRupee } from 'lucide-react';
import { PuffLoader } from 'react-spinners';
import { Link, useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000';

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const ViewUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalUsers: 0, hasMore: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [hasCreditFilter, setHasCreditFilter] = useState(false); // New state for credit filter
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    adress: '',
    phone: '',
    aadhar: '',
    aadharImage: null,
    aadharImageFile: null,
    profession: '',
  });

  const fetchUsers = async (pageNum, search = searchQuery, hasCredit = hasCreditFilter) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pageNum,
        limit: 10,
      });
      if (search) queryParams.append('search', search);
      if (hasCredit) queryParams.append('hasCredit', 'true'); // Add hasCredit query param

      const response = await fetch(`${API}/Users/getusers?${queryParams}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const { success, data, pagination: paginationData } = await response.json();
      if (!success) {
        throw new Error(data.message || 'Failed to fetch users');
      }

      setUsers(data);
      setPagination(paginationData);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load users.', {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedFetchUsers = useCallback(
    debounce((pageNum, search, hasCredit) => {
      fetchUsers(pageNum, search, hasCredit);
    }, 1000),
    []
  );

  useEffect(() => {
    fetchUsers(1);
  }, []);

  const handleSearchChange = (e) => {
    if (isLoading) return;
    const newSearchQuery = e.target.value;
    setSearchQuery(newSearchQuery);
    setPage(1);
    debouncedFetchUsers(1, newSearchQuery, hasCreditFilter);
  };

  const handleCreditFilterChange = (e) => {
    if (isLoading) return;
    const newHasCreditFilter = e.target.checked;
    setHasCreditFilter(newHasCreditFilter);
    setPage(1);
    debouncedFetchUsers(1, searchQuery, newHasCreditFilter);
  };

  const handleNextPage = () => {
    if (isLoading || !pagination.hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchUsers(nextPage, searchQuery, hasCreditFilter);
  };

  const handlePreviousPage = () => {
    if (isLoading || page <= 1) return;
    const prevPage = page - 1;
    setPage(prevPage);
    fetchUsers(prevPage, searchQuery, hasCreditFilter);
  };

  const handlePageClick = (pageNum) => {
    if (isLoading) return;
    setPage(pageNum);
    fetchUsers(pageNum, searchQuery, hasCreditFilter);
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const handleEditClick = (user) => {
    setEditUser(user);
    setFormData({
      name: user.name || '',
      adress: user.adress || '',
      phone: user.phone || '',
      aadhar: user.aadhar || '',
      aadharImage: user.aadharImage ? `${API}${user.aadharImage}` : null,
      aadharImageFile: null,
      profession: user.profession || '',
    });
  };

  const handleEditChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file', {
          position: 'top-right',
          autoClose: 3000,
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB', {
          position: 'top-right',
          autoClose: 3000,
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          aadharImage: reader.result,
          aadharImageFile: file,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.name || !formData.phone) {
        throw new Error('Name and Phone are required');
      }
      if (!/^[0-9]{10}$/.test(formData.phone)) {
        throw new Error('Phone number must be 10 digits');
      }
      if (formData.aadhar && !/^[0-9]{12}$/.test(formData.aadhar)) {
        throw new Error('Aadhar number must be 12 digits');
      }

      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('adress', formData.adress);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('aadhar', formData.aadhar || '');
      formDataToSend.append('profession', formData.profession);
      if (formData.aadharImageFile) {
        formDataToSend.append('aadharImage', formData.aadharImageFile);
      }

      const response = await fetch(`${API}/Users/updateuser/${editUser._id}`, {
        method: 'PUT',
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update user');
      }

      toast.success(data.message, {
        position: 'top-right',
        autoClose: 3000,
      });
      setEditUser(null);
      setFormData({
        name: '',
        adress: '',
        phone: '',
        aadhar: '',
        aadharImage: null,
        aadharImageFile: null,
        profession: '',
      });
      fetchUsers(page, searchQuery, hasCreditFilter);
    } catch (err) {
      toast.error(err.message, {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setEditUser(null);
    setFormData({
      name: '',
      adress: '',
      phone: '',
      aadhar: '',
      aadharImage: null,
      aadharImageFile: null,
      profession: '',
    });
  };

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
      {editUser && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" /> Edit User
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {[
                { label: 'Name', name: 'name', required: true, placeholder: 'Full name' },
                { label: 'Address', name: 'adress', placeholder: 'Enter address' },
                { label: 'Phone', name: 'phone', required: true, placeholder: '10-digit phone number', pattern: '[0-9]{10}' },
                { label: 'Aadhar Number', name: 'aadhar', placeholder: '12-digit Aadhar (optional)', pattern: '[0-9]{12}' },
                { label: 'Profession', name: 'profession', placeholder: 'Enter profession' },
              ].map(({ label, name, required, placeholder, pattern }) => (
                <div key={name}>
                  <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={name === 'phone' ? 'tel' : 'text'}
                    id={name}
                    name={name}
                    value={formData[name]}
                    onChange={handleEditChange}
                    required={required}
                    pattern={pattern}
                    disabled={isLoading}
                    className="block w-full rounded-md border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 py-2 px-3 text-sm placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div>
                <label htmlFor="aadharImage" className="block text-sm font-medium text-gray-700 mb-1">
                  Aadhar Image
                </label>
                <input
                  type="file"
                  id="aadharImage"
                  name="aadharImage"
                  accept="image/*"
                  onChange={handleEditImageChange}
                  disabled={isLoading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {formData.aadharImage && (
                  <div className="mt-3">
                    <img
                      src={formData.aadharImage}
                      alt="Aadhar preview"
                      className="h-16 w-20 object-cover rounded-md shadow-sm border border-gray-200"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                >
                  {isLoading ? 'Updating...' : 'Update User'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isLoading}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center">
            <User className="h-6 w-6 mr-2 text-blue-600" /> Users
          </h2>
          <button
            onClick={() => navigate('/create')}
            className="py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 text-sm font-semibold"
          >
            Create User
          </button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-1">
              Search Users
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="searchQuery"
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search by name, phone, aadhar, or address"
                className={`w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm bg-white shadow-sm placeholder-gray-400 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={hasCreditFilter}
                onChange={handleCreditFilterChange}
                disabled={isLoading}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-200 rounded"
              />
              Show only users with credit
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          {users.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm font-medium">
              No users found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <tr>
                      {[
                        { label: 'Name', field: 'name', icon: <User className="h-4 w-4 mr-1" /> },
                        { label: 'Address', field: 'adress', icon: <Home className="h-4 w-4 mr-1" /> },
                        { label: 'Phone', field: 'phone', icon: <Phone className="h-4 w-4 mr-1" /> },
                        { label: 'Aadhar', field: 'aadhar', icon: <IdCard className="h-4 w-4 mr-1" /> },
                        { label: 'Image', field: 'aadharImage', icon: null },
                        { label: 'Profession', field: 'profession', icon: <Briefcase className="h-4 w-4 mr-1" /> },
                        { label: 'Total Credit', field: 'totalCredit', icon: <IndianRupee className="h-4 w-4 mr-1" /> },
                        { label: 'Actions', field: 'actions', icon: null },
                      ].map(({ label, field, icon }) => (
                        <th
                          key={field}
                          className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    {users.map((user, index) => (
                      <tr
                        key={user._id}
                        className={`${
                          index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                        } hover:bg-blue-50 transition duration-150 ${isLoading ? 'cursor-not-allowed' : ''}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 font-medium">
                          <Link to={`/user/${user._id}`} className="text-blue-600 hover:underline">
                            {user.name || 'N/A'}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {user.adress || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                          {user.phone || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                          {user.aadhar || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 w-12">
                          {user.aadharImage ? (
                            <div className="relative group">
                              <img
                                src={`${API}${user.aadharImage}`}
                                alt="Aadhar"
                                className="h-8 w-12 object-cover rounded-md cursor-pointer hover:shadow-md transition-shadow duration-200"
                                onClick={() => handleImageClick(`${API}${user.aadharImage}`)}
                              />
                              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                View Image
                              </span>
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                          {user.profession || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                          ₹{(user.totalCredit || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleEditClick(user)}
                            disabled={isLoading}
                            className="text-blue-600 hover:text-blue-800 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit User"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(pagination.hasMore || page > 1) && (
                <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-sm text-gray-600 font-medium">
                    Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, pagination.totalUsers)} of{' '}
                    {pagination.totalUsers} users
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePreviousPage}
                      disabled={page === 1 || isLoading}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Previous
                    </button>
                    <div className="flex gap-1">
                      {[...Array(Math.min(pagination.totalPages, 5))].map((_, index) => {
                        const pageNum = index + 1;
                        return (
                          <button
                            key={`page-${pageNum}`}
                            onClick={() => handlePageClick(pageNum)}
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
                      onClick={handleNextPage}
                      disabled={!pagination.hasMore || isLoading}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewUsers;