import React, { useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Search, Wrench, Package, Pencil, X, IndianRupee } from 'lucide-react';
import { PuffLoader } from 'react-spinners';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const ViewTools = () => {
  const [tools, setTools] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalTools: 0, hasMore: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [editTool, setEditTool] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    count: '',
    price: '',
    category: 'Power Tools',
    image: null,
    imageFile: null,
  });
  const [errors, setErrors] = useState({});

  const fetchTools = async (pageNum, search = searchQuery, category = categoryFilter) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pageNum,
        limit: 10,
      });
      if (search) queryParams.append('search', search);
      if (category) queryParams.append('category', category);

      const response = await fetch(`${API}/Tools/gettools?${queryParams}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tools: ${response.status}`);
      }

      const { success, data, pagination: paginationData } = await response.json();
      if (!success) {
        throw new Error(data.message || 'Failed to fetch tools');
      }

      setTools(data);
      setPagination(paginationData);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load tools.', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedFetchTools = useCallback(
    debounce((pageNum, search, category) => {
      fetchTools(pageNum, search, category);
    }, 1000),
    []
  );

  useEffect(() => {
    fetchTools(1);
  }, []);

  const handleSearchChange = (e) => {
    if (isLoading) return;
    const newSearchQuery = e.target.value;
    setSearchQuery(newSearchQuery);
    setPage(1);
    debouncedFetchTools(1, newSearchQuery, categoryFilter);
  };

  const handleCategoryChange = (e) => {
    if (isLoading) return;
    const newCategory = e.target.value;
    setCategoryFilter(newCategory);
    setPage(1);
    debouncedFetchTools(1, searchQuery, newCategory);
  };

  const handleNextPage = () => {
    if (isLoading || !pagination.hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTools(nextPage, searchQuery, categoryFilter);
  };

  const handlePreviousPage = () => {
    if (isLoading || page <= 1) return;
    const prevPage = page - 1;
    setPage(prevPage);
    fetchTools(prevPage, searchQuery, categoryFilter);
  };

  const handlePageClick = (pageNum) => {
    if (isLoading) return;
    setPage(pageNum);
    fetchTools(pageNum, searchQuery, categoryFilter);
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const handleEditClick = (tool) => {
    setEditTool(tool);
    setFormData({
      name: tool.name || '',
      count: tool.count ?? '',
      price: tool.price || 0,
      category: tool.category || 'Power Tools',
      image: tool.image ? `${API}${tool.image}` : null,
      imageFile: null,
    });
    setErrors({});
  };

  const validateField = (name, value) => {
    const newErrors = { ...errors };
    if (name === 'name' && !value.trim()) {
      newErrors.name = 'Tool name is required';
    } else if (name === 'name') {
      delete newErrors.name;
    }
    if (name === 'price' && (!value || isNaN(value) || parseFloat(value) < 0)) {
      newErrors.price = 'Price must be a non-negative number';
    } else if (name === 'price') {
      delete newErrors.price;
    }
    if (name === 'count' && formData.category === 'Power Tools' && (!value || isNaN(value) || parseInt(value) < 0)) {
      newErrors.count = 'Count is required for Power Tools and must be a non-negative number';
    } else if (name === 'count') {
      delete newErrors.count;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validateField(name, value);
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file', { position: 'top-right', autoClose: 3000 });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB', { position: 'top-right', autoClose: 3000 });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          image: reader.result,
          imageFile: file,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      image: null,
      imageFile: null,
    }));
    document.getElementById('image').value = '';
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.name || !formData.price || !formData.category) {
        throw new Error('Name, price, and category are required');
      }
      if (isNaN(formData.price) || formData.price < 0) {
        throw new Error('Price must be a non-negative number');
      }
      if (!['Power Tools', 'Accessories'].includes(formData.category)) {
        throw new Error('Invalid category');
      }
      if (formData.category === 'Power Tools' && (formData.count === '' || isNaN(formData.count) || formData.count < 0)) {
        throw new Error('Count is required for Power Tools and must be a non-negative number');
      }

      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      if (formData.category === 'Power Tools') {
        formDataToSend.append('count', formData.count);
      }
      formDataToSend.append('price', formData.price);
      formDataToSend.append('category', formData.category);
      if (formData.imageFile) {
        formDataToSend.append('image', formData.imageFile);
      }

      const response = await fetch(`${API}/Tools/updatetool/${editTool._id}`, {
        method: 'PUT',
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update tool');
      }

      toast.success(data.message, {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      setEditTool(null);
      setFormData({
        name: '',
        count: '',
        price: '',
        category: 'Power Tools',
        image: null,
        imageFile: null,
      });
      setErrors({});
      fetchTools(page, searchQuery, categoryFilter);
    } catch (err) {
      toast.error(err.message, {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setEditTool(null);
    setFormData({
      name: '',
      count: '',
      price: '',
      category: 'Power Tools',
      image: null,
      imageFile: null,
    });
    setErrors({});
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
          className="fixed inset-0 bg-gray-800 bg-opacity-80 flex justify-center items-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative">
            <img 
              src={selectedImage} 
              alt="Tool" 
              className="max-w-[90%] max-h-[90vh] object-contain rounded-xl shadow-xl border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center hover:bg-red-600 transition-colors duration-200"
              aria-label="Close image preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {editTool && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Wrench className="h-5 w-5 mr-2 text-blue-600" /> Edit Tool
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
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleEditChange}
                  required
                  disabled={isLoading}
                  className={`block w-full rounded-md border ${errors.name ? 'border-red-500' : 'border-gray-200'} shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 py-2 px-3 text-sm placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed`}
                  placeholder="Enter tool name"
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>
              {formData.category === 'Power Tools' && (
                <div>
                  <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-1">
                    Count <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="count"
                    name="count"
                    value={formData.count}
                    onChange={handleEditChange}
                    required
                    min="0"
                    disabled={isLoading}
                    className={`block w-full rounded-md border ${errors.count ? 'border-red-500' : 'border-gray-200'} shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 py-2 px-3 text-sm placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed`}
                    placeholder="Available count"
                  />
                  {errors.count && <p className="mt-1 text-xs text-red-500">{errors.count}</p>}
                </div>
              )}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Price (per day) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleEditChange}
                    required
                    min="0"
                    step="0.01"
                    disabled={isLoading}
                    className={`block w-full rounded-md border ${errors.price ? 'border-red-500' : 'border-gray-200'} shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 py-2 pl-10 pr-3 text-sm placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed`}
                    placeholder="Rental price"
                  />
                </div>
                {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleEditChange}
                  required
                  disabled={isLoading}
                  className="block w-full rounded-md border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 py-2 px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="Power Tools">Power Tools</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>
              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                  Tool Image <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <input
                  type="file"
                  id="image"
                  name="image"
                  accept="image/*"
                  onChange={handleEditImageChange}
                  disabled={isLoading}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {formData.image && (
                  <div className="mt-2 relative">
                    <img
                      src={formData.image}
                      alt="Tool preview"
                      className="h-24 w-24 object-cover rounded-md shadow-sm border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center transform translate-x-1/2 -translate-y-1/2 hover:bg-red-600 transition-colors duration-200"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isLoading}
                  className="relative group flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                >
                  Cancel
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    Close without saving
                  </span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading || Object.keys(errors).length > 0}
                  className="relative group flex-1 py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                >
                  {isLoading ? 'Updating...' : 'Update Tool'}
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    Save tool changes
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <Wrench className="h-6 w-6 mr-2 text-blue-600" /> Tools
        </h2>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative max-w-xs">
            <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-1">
              Search Tools
            </label>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                id="searchQuery"
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search by tool name"
                className={`w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm bg-white shadow-sm placeholder-gray-400 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              />
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                Search tools by name
              </span>
            </div>
          </div>
          <div>
            <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <div className="relative group">
              <select
                id="categoryFilter"
                value={categoryFilter}
                onChange={handleCategoryChange}
                className={`w-full sm:w-48 rounded-md border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 py-2 px-3 text-sm ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              >
                <option value="">All Categories</option>
                <option value="Power Tools">Power Tools</option>
                <option value="Accessories">Accessories</option>
              </select>
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                Filter by category
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          {tools.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm font-medium">
              No tools found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <tr>
                      {[
                        { label: 'Name', field: 'name', icon: <Wrench className="h-4 w-4 mr-1" /> },
                        { label: 'Count', field: 'count', icon: <Package className="h-4 w-4 mr-1" /> },
                        { label: 'Price', field: 'price', icon: <IndianRupee className="h-4 w-4 mr-1" /> },
                        { label: 'Category', field: 'category', icon: null },
                        { label: 'Image', field: 'image', icon: null },
                        { label: 'Actions', field: 'actions', icon: null },
                      ].map(({ label, field, icon }) => (
                        <th
                          key={field}
                          className={`px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    {tools.map((tool, index) => (
                      <tr
                        key={tool._id}
                        className={`${
                          index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                        } hover:bg-blue-50 transition duration-150 ${isLoading ? 'cursor-not-allowed' : ''}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 font-medium">
                          {tool.name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                          {tool.count ?? 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 flex items-center">
                          <IndianRupee className="h-4 w-4 mr-1" />
                          {tool.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                          {tool.category}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                          {tool.image ? (
                            <div className="relative group">
                              <img
                                src={`${API}${tool.image}`}
                                alt="Tool"
                                className="h-8 w-12 object-cover rounded-md cursor-pointer hover:shadow-md transition-shadow duration-200 border border-gray-200"
                                onClick={() => handleImageClick(`${API}${tool.image}`)}
                              />
                              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                View full image
                              </span>
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="relative group">
                            <button
                              onClick={() => handleEditClick(tool)}
                              disabled={isLoading}
                              className="text-blue-600 hover:text-blue-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Edit tool"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                              Edit tool
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(pagination.hasMore || page > 1) && (
                <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-sm text-gray-600 font-medium">
                    Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, pagination.totalTools)} of{' '}
                    {pagination.totalTools} tools
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative group">
                      <button
                        onClick={handlePreviousPage}
                        disabled={page === 1 || isLoading}
                        className={`px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold`}
                      >
                        Previous
                      </button>
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        Previous page
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(Math.min(pagination.totalPages, 5))].map((_, index) => {
                        const pageNum = index + 1;
                        return (
                          <div key={`page-${pageNum}`} className="relative group">
                            <button
                              onClick={() => handlePageClick(pageNum)}
                              disabled={isLoading}
                              className={`px-3 py-1 rounded-md text-sm font-medium ${
                                page === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                              } transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {pageNum}
                            </button>
                            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                Go to page {pageNum}
                              </span>
                          </div>
                        );
                      })}
                      {pagination.totalPages > 5 && (
                        <span className="text-sm text-gray-600">...</span>
                      )}
                    </div>
                    <div className="relative group">
                      <button
                        onClick={handleNextPage}
                        disabled={!pagination.hasMore || isLoading}
                        className={`px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold`}
                      >
                        Next
                      </button>
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        Next page
                      </span>
                    </div>
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

export default ViewTools;