import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PuffLoader } from 'react-spinners';
import { Wrench, X, IndianRupee } from 'lucide-react';

const ToolForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    count: '',
    price: '',
    image: null,
    imageFile: null,
    category: 'Power Tools',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validateField(name, value);
  };

  const handleImageChange = (e) => {
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

  const handleReset = () => {
    setFormData({
      name: '',
      count: '',
      price: '',
      image: null,
      imageFile: null,
      category: 'Power Tools',
    });
    setErrors({});
    document.getElementById('image').value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.name || !formData.price || !formData.category) {
        throw new Error('Name, price, and category are required');
      }
      if (isNaN(formData.price) || formData.price < 0) {
        throw new Error('Price must be a non-negative number');
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

      const response = await fetch('http://localhost:5000/Tools/createtool', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create tool');
      }

      toast.success(data.message, {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      handleReset();
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

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pl-52 lg:pl-60 pb-8 px-4 sm:px-6 lg:px-8 flex justify-center items-start">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <ToastContainer position="top-right" autoClose={3000} />
        {isLoading && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex justify-center items-center z-50">
            <PuffLoader color="#3b82f6" size={60} aria-label="Loading" />
          </div>
        )}
        <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <Wrench className="h-6 w-6 mr-2 text-blue-600" /> Add Tool
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Tool Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
              onChange={handleChange}
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
              onChange={handleImageChange}
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
              onClick={handleReset}
              disabled={isLoading}
              className="relative group flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
            >
              Reset
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                Clear all fields
              </span>
            </button>
            <button
              type="submit"
              disabled={isLoading || Object.keys(errors).length > 0}
              className="relative group flex-1 py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
            >
              {isLoading ? 'Adding...' : 'Add Tool'}
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                Submit tool details
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ToolForm;