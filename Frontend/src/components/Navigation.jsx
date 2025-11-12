import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { UserPlus, Users, Wrench, Package, Truck, List, Menu, X, DollarSign } from 'lucide-react';

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold tracking-tight">Thallal Rent House</h1>
            <button
              className="md:hidden p-2 rounded-md hover:bg-blue-600 transition-colors duration-200"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Sidebar (Desktop) / Mobile Menu */}
      <div
        className={`fixed top-16 left-0 bg-white shadow-md border-r border-gray-200 z-20 transition-all duration-300 ease-in-out
          md:w-48 w-full h-[calc(100vh-64px)] 
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="p-4 space-y-2 flex flex-col h-full">
          {[
            { to: '/create', title: 'Create User', icon: <UserPlus className="h-5 w-5" />, label: 'Create User' },
            { to: '/view', title: 'View Users', icon: <Users className="h-5 w-5" />, label: 'View Users' },
            { to: '/add-tool', title: 'Add Tool', icon: <Wrench className="h-5 w-5" />, label: 'Add Tool' },
            { to: '/view-tools', title: 'View Tools', icon: <Package className="h-5 w-5" />, label: 'View Tools' },
            { to: '/create-rental', title: 'Create Rental', icon: <Truck className="h-5 w-5" />, label: 'Create Rental' },
            { to: '/view-rentals', title: 'View Rentals', icon: <List className="h-5 w-5" />, label: 'View Rentals' },
            { to: '/daily-transactions', title: 'Daily Transactions', icon: <DollarSign className="h-5 w-5" />, label: 'Daily Transactions' },
          ].map(({ to, title, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={title}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-sm font-medium
                ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'}`
              }
            >
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navigation;