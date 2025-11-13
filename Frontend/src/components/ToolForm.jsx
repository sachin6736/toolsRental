// src/components/ToolForm.jsx
import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PuffLoader } from 'react-spinners';
import { Wrench, X, IndianRupee } from 'lucide-react';

// Use Vite environment variable
const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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

  // Validate individual field
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

    if (name === 'count' && formData.category === 'Power Tools') {
      if (!value || isNaN(value) || parseInt(value) < 0) {
        newErrors.count = 'Count is required and must be ≥ 0';
      } else {
        delete newErrors.count;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file', { autoClose: 3000 });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB', { autoClose: 3000 });
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
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      image: null,
      imageFile: null,
    }));
    const input = document.getElementById('image');
    if (input) input.value = '';
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
    const input = document.getElementById('image');
    if (input) input.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Final validation
      if (!formData.name.trim()) throw new Error('Tool name is required');
      if (!formData.price || formData.price < 0) throw new Error('Valid price is required');
      if (formData.category === 'Power Tools' && (!formData.count || formData.count < 0)) {
        throw new Error('Count is required for Power Tools');
      }

      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('price', formData.price);
      formDataToSend.append('category', formData.category);

      if (formData.category === 'Power Tools') {
        formDataToSend.append('count', formData.count);
      }

      if (formData.imageFile) {
        formDataToSend.append('image', formData.imageFile);
      }

      const response = await fetch(`${API}/Tools/createtool`, {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create tool');
      }

      toast.success(data.message || 'Tool added successfully!', {
        position: 'top-right',
        autoClose: 3000,
      });

      handleReset();
    } catch (err) {
      toast.error(err.message, {
        position: 'top-right',
        autoClose: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pl-52 lg:pl-60 pb-8 px-4 sm:px-6 lg:px-8 flex justify-center items-start">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <ToastContainer position="top-right" autoClose={3000} />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex justify-center items-center z-50">
            <PuffLoader color="#3b82f6" size={60} />
          </div>
        )}

        <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <Wrench className="h-6 w-6 mr-2 text-blue-600" /> Add New Tool
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tool Name */}
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
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-md text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              } disabled:opacity-50`}
              placeholder="e.g., Drill Machine"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Count (Only for Power Tools) */}
          {formData.category === 'Power Tools' && (
            <div>
              <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-1">
                Available Count <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="count"
                name="count"
                value={formData.count}
                onChange={handleChange}
                min="0"
                disabled={isLoading}
                className={`w-full px-3 py-2 border rounded-md text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                  errors.count ? 'border-red-500' : 'border-gray-300'
                } disabled:opacity-50`}
                placeholder="e.g., 5"
              />
              {errors.count && <p className="mt-1 text-xs text-red-500">{errors.count}</p>}
            </div>
          )}

          {/* Price */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price per Day <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                disabled={isLoading}
                className={`w-full pl-10 pr-3 py-2 border rounded-md text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                } disabled:opacity-50`}
                placeholder="e.g., 150"
              />
            </div>
            {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="Power Tools">Power Tools</option>
              <option value="Accessories">Accessories</option>
            </select>
          </div>

          {/* Image Upload */}
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
              Tool Image <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              disabled={isLoading}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            {formData.image && (
              <div className="mt-3 relative inline-block">
                <img
                  src={formData.image}
                  alt="Preview"
                  className="h-28 w-28 object-cover rounded-lg shadow-md border border-gray-200"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isLoading || Object.keys(errors).length > 0}
              className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-md hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add Tool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ToolForm;