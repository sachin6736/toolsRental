import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PuffLoader } from 'react-spinners';
import { UserPlus, X } from 'lucide-react';

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
      newErrors.phone = 'Phone number must be 10 digits';
    } else if (name === 'phone') {
      delete newErrors.phone;
    }
    if (name === 'aadhar' && value && !/^[0-9]{12}$/.test(value)) {
      newErrors.aadhar = 'Aadhar number must be 12 digits';
    } else if (name === 'aadhar') {
      delete newErrors.aadhar;
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
          aadharImage: reader.result,
          aadharImageFile: file,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      aadharImage: null,
      aadharImageFile: null,
    }));
    document.getElementById('aadharImage').value = '';
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
    document.getElementById('aadharImage').value = '';
  };

  const handleSubmit = async (e) => {
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

      const response = await fetch('http://localhost:5000/Users/createuser', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user');
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
          <UserPlus className="h-6 w-6 mr-2 text-blue-600" /> Add User
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              required
              disabled={isLoading}
              className={`block w-full rounded-md border ${errors.name ? 'border-red-500' : 'border-gray-200'} shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 py-2 px-3 text-sm placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed`}
              placeholder="Enter full name"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

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
              className="block w-full rounded-md border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 py-2 px-3 text-sm placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter address"
            />
          </div>

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
              required
              pattern="[0-9]{10}"
              disabled={isLoading}
              className={`block w-full rounded-md border ${errors.phone ? 'border-red-500' : 'border-gray-200'} shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 py-2 px-3 text-sm placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed`}
              placeholder="Enter 10-digit phone number"
            />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
          </div>

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
              pattern="[0-9]{12}"
              disabled={isLoading}
              className={`block w-full rounded-md border ${errors.aadhar ? 'border-red-500' : 'border-gray-200'} shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 py-2 px-3 text-sm placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed`}
              placeholder="Enter 12-digit Aadhar number"
            />
            {errors.aadhar && <p className="mt-1 text-xs text-red-500">{errors.aadhar}</p>}
          </div>

          <div>
            <label htmlFor="aadharImage" className="block text-sm font-medium text-gray-700 mb-1">
              Aadhar Image <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <input
              type="file"
              id="aadharImage"
              name="aadharImage"
              accept="image/*"
              onChange={handleImageChange}
              disabled={isLoading}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {formData.aadharImage && (
              <div className="mt-2 relative">
                <img
                  src={formData.aadharImage}
                  alt="Aadhar preview"
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
              className="block w-full rounded-md border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 py-2 px-3 text-sm placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter profession"
            />
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
              {isLoading ? 'Creating...' : 'Add User'}
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                Submit user details
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;