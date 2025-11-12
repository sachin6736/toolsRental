import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import UserForm from './components/UserForm';
import ViewUsers from './components/ViewUsers';
import ToolForm from './components/ToolForm';
import ViewTools from './components/ViewTools';
import CreateRental from './components/CreateRental';
import ViewRentals from './components/ViewRentals';
import TrackRental from './components/TrackRental';
import UserDetails from './components/UserDetails';
import DailyTransactions from './components/DailyTransactions';

const App = () => {
  return (
    <Router>
      <Navigation />
      <Routes>
        <Route path="/create" element={<UserForm />} />
        <Route path="/view" element={<ViewUsers />} />
        <Route path="/add-tool" element={<ToolForm />} />
        <Route path="/view-tools" element={<ViewTools />} />
        <Route path="/create-rental" element={<CreateRental />} />
        <Route path="/view-rentals" element={<ViewRentals />} />
        <Route path="/track-rental/:id" element={<TrackRental />} />
        <Route path="/user/:id" element={<UserDetails />} />
        <Route path="/daily-transactions" element={<DailyTransactions />} />
        <Route path="/" element={<UserForm />} />
      </Routes>
    </Router>
  );
};

export default App;