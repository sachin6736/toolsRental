// src/components/UserForm.jsx
import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PuffLoader } from 'react-spinners';
import { UserPlus, X } from 'lucide-react';

// Use Vite environment variable
const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const UserForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    adress: '',
    phone: '',
    aadhar: '',
    aadharImage: null,
    aadharImageFile: null,
    profession: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateField = (name, value) => {
    const newErrors = { ...errors };

    if (name === 'name' && !value.trim()) {
      newErrors.name = 'Name is required';
    } else if (name === 'name') {
      delete newErrors.name;
    }

    if (name === 'phone' && (!value || !/^[0-9]{10}$/.test(value))) {
      newErrors.phone = 'Phone must be exactly 10 digits';
    } else if (name === 'phone') {
      delete newErrors.phone;
    }

    if (name === 'aadhar' && value && !/^[0-9]{12}$/.test(value)) {
      newErrors.aadhar = 'Aadhar must be 12 digits';
    } else if (name === 'aadhar') {
      delete newErrors.aadhar;
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
      toast.error('Please upload a valid image', { autoClose: 3000 });
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
        aadharImage: reader.result,
        aadharImageFile: file,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      aadharImage: null,
      aadharImageFile: null,
    }));
    const input = document.getElementById('aadharImage');
    if (input) input.value = '';
  };

  const handleReset = () => {
    setFormData({
      name: '',
      adress: '',
      phone: '',
      aadhar: '',
      aadharImage: null,
      aadharImageFile: null,
      profession: '',
    });
    setErrors({});
    const input = document.getElementById('aadharImage');
    if (input) input.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.name.trim()) throw new Error('Name is required');
      if (!/^[0-9]{10}$/.test(formData.phone)) throw new Error('Phone must be 10 digits');
      if (formData.aadhar && !/^[0-9]{12}$/.test(formData.aadhar)) throw new Error('Aadhar must be 12 digits');

      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('adress', formData.adress);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('aadhar', formData.aadhar || '');
      formDataToSend.append('profession', formData.profession);
      if (formData.aadharImageFile) {
        formDataToSend.append('aadharImage', formData.aadharImageFile);
      }

      const response = await fetch(`${API}/Users/createuser`, {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user');
      }

      toast.success(data.message || 'User created successfully!', {
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

        {isLoading && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex justify-center items-center z-50">
            <PuffLoader color="#3b82f6" size={60} />
          </div>
        )}

        <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <UserPlus className="h-6 w-6 mr-2 text-blue-600" /> Add New User
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
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
              placeholder="John Doe"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Address */}
          <div>
            <label htmlFor="adress" className="block text-sm font-medium text-gray-700 mb-1">
              Address <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <input
              type="text"
              id="adress"
              name="adress"
              value={formData.adress}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              placeholder="123 Main St, City"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-md text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              } disabled:opacity-50`}
              placeholder="9876543210"
            />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
          </div>

          {/* Aadhar */}
          <div>
            <label htmlFor="aadhar" className="block text-sm font-medium text-gray-700 mb-1">
              Aadhar Number <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <input
              type="text"
              id="aadhar"
              name="aadhar"
              value={formData.aadhar}
              onChange={handleChange}
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-md text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                errors.aadhar ? 'border-red-500' : 'border-gray-300'
              } disabled:opacity-50`}
              placeholder="123456789012"
            />
            {errors.aadhar && <p className="mt-1 text-xs text-red-500">{errors.aadhar}</p>}
          </div>

          {/* Aadhar Image */}
          <div>
            <label htmlFor="aadharImage" className="block text-sm font-medium text-gray-700 mb-1">
              Aadhar Image <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <input
              type="file"
              id="aadharImage"
              accept="image/*"
              onChange={handleImageChange}
              disabled={isLoading}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            {formData.aadharImage && (
              <div className="mt-3 relative inline-block">
                <img
                  src={formData.aadharImage}
                  alt="Aadhar preview"
                  className="h-28 w-28 object-cover rounded-lg shadow-md border border-gray-200"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Profession */}
          <div>
            <label htmlFor="profession" className="block text-sm font-medium text-gray-700 mb-1">
              Profession <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <input
              type="text"
              id="profession"
              name="profession"
              value={formData.profession}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              placeholder="Carpenter, Electrician, etc."
            />
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
              {isLoading ? 'Creating...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;