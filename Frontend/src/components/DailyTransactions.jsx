// pages/DailyTransactions.jsx
import React, { useState, useEffect, useMemo } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  DollarSign,
  Calendar,
  Plus,
  Download,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  Wallet,
  Minus
} from "lucide-react";
import { PuffLoader } from "react-spinners";

const API = "http://localhost:5000";

const CATEGORY_OPTIONS = [
  "Rent & Utilities",
  "Labour Charges",
  "Tea & Snacks",
  "Tool Inventory & Maintenance",
  "Stationary",
  "Miscellaneous",
  "Manual Credit",
];

const DailyTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  const [isClosed, setIsClosed] = useState(false);
  const [closingBalance, setClosingBalance] = useState(0);
  const [closingCash, setClosingCash] = useState(0);
  const [closingUPI, setClosingUPI] = useState(0);

  // Opening balance
  const [openingLoaded, setOpeningLoaded] = useState(false);
  const [prevClosing, setPrevClosing] = useState(null);

  const [debitForm, setDebitForm] = useState({
    amount: "",
    category: "",
    notes: "",
    paymentMethod: "Cash",
    description: "",
  });
  const [creditForm, setCreditForm] = useState({
    amount: "",
    paymentMethod: "Cash",
    description: "",
    notes: "",
  });
  const [transferForm, setTransferForm] = useState({
    amount: "",
    from: "Cash",
    to: "UPI",
    notes: "",
  });

  // ---------- FETCH ----------
  const fetchTx = async (date) => {
    setIsLoading(true);
    try {
      const d = new Date(date).toLocaleDateString("en-IN");
      const res = await fetch(`${API}/dailytransactions?date=${d}`);
      const { success, data } = await res.json();
      if (!success) throw new Error();

      setTransactions(data);

      if (data.length > 0) {
        const doc = data[0];
        setIsClosed(doc.isClosed);
        setClosingBalance(doc.closingBalance || 0);
        setClosingCash(doc.closingCash || 0);
        setClosingUPI(doc.closingUPI || 0);
        setOpeningLoaded(doc.openingBalance > 0);
      } else {
        setIsClosed(false);
        setClosingBalance(0);
        setClosingCash(0);
        setClosingUPI(0);
        setOpeningLoaded(false);
      }
    } catch {
      toast.error("Failed to load transactions");
      setTransactions([]);
      setIsClosed(false);
      setClosingBalance(0);
      setClosingCash(0);
      setClosingUPI(0);
      setOpeningLoaded(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTx(selectedDate);
  }, [selectedDate]);

  // ---------- BALANCE ----------
  const {
    cashBalance,
    upiBalance,
    cashCredit,
    cashDebit,
    upiCredit,
    upiDebit,
    totalDebit,
    totalCredit,
  } = useMemo(() => {
    const all = transactions.flatMap((d) => d.transactions || []);
    const cash = { credit: 0, debit: 0 };
    const upi = { credit: 0, debit: 0 };

    all.forEach((tx) => {
      if (tx.type === "debit") {
        if (tx.paymentMethod === "Cash") cash.debit += tx.amount;
        if (tx.paymentMethod === "UPI") upi.debit += tx.amount;
      } else {
        if (tx.paymentMethod === "Cash") cash.credit += tx.amount;
        if (tx.paymentMethod === "UPI") upi.credit += tx.amount;
      }
    });

    const tDebit = cash.debit + upi.debit;
    const tCredit = cash.credit + upi.credit;

    return {
      cashBalance: cash.credit - cash.debit,
      upiBalance: upi.credit - upi.debit,
      cashCredit: cash.credit,
      cashDebit: cash.debit,
      upiCredit: upi.credit,
      upiDebit: upi.debit,
      totalDebit: tDebit,
      totalCredit: tCredit,
    };
  }, [transactions]);

  // ---------- GROUPED DATA ----------
  const grouped = useMemo(() => {
    const flat = transactions
      .flatMap((d) => d.transactions.map((t) => ({ ...t, date: d.date })))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const groups = {};

    flat.forEach((tx) => {
      const cat = tx.category || "Sales & Repayment";
      if (!groups[cat]) groups[cat] = { debit: [], credit: [] };
      if (tx.type === "debit") groups[cat].debit.push(tx);
      else groups[cat].credit.push(tx);
    });

    return groups;
  }, [transactions]);

  // ---------- FIND PREVIOUS CLOSING ----------
  const findPreviousClosing = async () => {
    let date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);

    while (date.getFullYear() > 2020) {
      const dateStr = date.toLocaleDateString("en-IN");
      try {
        const res = await fetch(`${API}/dailytransactions?date=${dateStr}`);
        const { data } = await res.json();
        if (data[0]?.isClosed) {
          return {
            date: data[0].date,
            cash: data[0].closingCash,
            upi: data[0].closingUPI,
            total: data[0].closingBalance,
          };
        }
      } catch {}
      date.setDate(date.getDate() - 1);
    }
    return null;
  };

  // ---------- SET OPENING BALANCE ----------
  const setOpeningBalance = async () => {
    try {
      const res = await fetch(`${API}/dailytransactions/opening-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("Opening balance set from previous day");
      setShowOpeningModal(false);
      setOpeningLoaded(true);
      fetchTx(selectedDate);
    } catch (err) {
      toast.error(err.message || "Failed to set opening balance");
    }
  };

  // ---------- MODAL HANDLERS ----------
  const submitDebit = async () => {
    if (isClosed) return toast.warn("Day is closed. Undo closing to add debit.");
    const amount = parseFloat(debitForm.amount);
    if (!amount || !debitForm.category) return toast.warn("Amount & Category required");
    const available = debitForm.paymentMethod === "Cash" ? cashBalance : upiBalance;
    if (amount > available)
      return toast.error(`Insufficient ${debitForm.paymentMethod} balance. Available: ₹${available.toFixed(2)}`);

    try {
      const payload = { ...debitForm, amount, date: selectedDate };
      const res = await fetch(`${API}/dailytransactions/debit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("Debit added");
      setShowDebitModal(false);
      setDebitForm({ amount: "", category: "", notes: "", paymentMethod: "Cash", description: "" });
      fetchTx(selectedDate);
    } catch (err) {
      toast.error(err.message || "Failed to add debit");
    }
  };

  const submitCredit = async () => {
    if (isClosed) return toast.warn("Day is closed. Undo closing to add credit.");
    const amount = parseFloat(creditForm.amount);
    if (!amount) return toast.warn("Enter valid amount");

    try {
      const payload = { ...creditForm, amount, date: selectedDate };
      const res = await fetch(`${API}/dailytransactions/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("Credit added");
      setShowCreditModal(false);
      setCreditForm({ amount: "", paymentMethod: "Cash", description: "", notes: "" });
      fetchTx(selectedDate);
    } catch (err) {
      toast.error(err.message || "Failed to add credit");
    }
  };

  const submitTransfer = async () => {
    if (isClosed) return toast.warn("Day is closed. Undo closing to transfer.");
    const amount = parseFloat(transferForm.amount);
    if (!amount || amount <= 0) return toast.warn("Enter valid amount");
    const available = transferForm.from === "Cash" ? cashBalance : upiBalance;
    if (amount > available) return toast.error(`Insufficient ${transferForm.from} balance`);

    try {
      const payload = { ...transferForm, amount, date: selectedDate };
      const res = await fetch(`${API}/dailytransactions/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("Transfer completed");
      setShowTransferModal(false);
      setTransferForm({ amount: "", from: "Cash", to: "UPI", notes: "" });
      fetchTx(selectedDate);
    } catch (err) {
      toast.error(err.message || "Transfer failed");
    }
  };

  // ---------- CLOSING HANDLERS ----------
  const closeDay = async () => {
    try {
      const res = await fetch(`${API}/dailytransactions/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("Day closed");
      fetchTx(selectedDate);
    } catch (err) {
      toast.error(err.message || "Failed to close day");
    }
  };

  const undoClose = async () => {
    try {
      const res = await fetch(`${API}/dailytransactions/undo-close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("Undo successful");
      fetchTx(selectedDate);
    } catch (err) {
      toast.error(err.message || "Failed to undo");
    }
  };

  // ---------- CSV ----------
// ---------- CSV ----------
const exportCSV = () => {
  const rows = [
    ["Side", "Method", "Type", "Amount", "Category", "Time"], // ← Removed Description, Notes
  ];

  transactions.forEach((d) =>
    d.transactions.forEach((tx) => {
      const side = tx.type === "debit" ? "Debit" : "Credit";
      rows.push([
        side,
        tx.paymentMethod,
        tx.type === "debit" ? "Expense" : tx.type,
        tx.amount.toFixed(2),
        tx.category || "",
        new Date(tx.createdAt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      ]);
    })
  );

  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ledger_${selectedDate}.csv`;
  a.click();
  URL.revokeObjectURL(url); // Clean up
};

  const toggleGroup = (cat) => {
    setExpandedGroups((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // ---------- RENDER ----------
  return (
    <div className="min-h-screen bg-gray-50 pt-16 md:pl-48">
  <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto"></div>
      <ToastContainer />
      {isLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <PuffLoader color="#2563eb" />
        </div>
      )}
  
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <DollarSign className="h-6 w-6 mr-2 text-blue-600" />
            Daily Ledger
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-0">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
  
            {/* SET OPENING BALANCE BUTTON */}
            {!isClosed && !openingLoaded && (
              <button
                onClick={async () => {
                  const prev = await findPreviousClosing();
                  if (prev) {
                    setPrevClosing(prev);
                    setShowOpeningModal(true);
                  } else {
                    toast.warn("No previous closed day found to carry forward.");
                  }
                }}
                className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-md text-sm hover:bg-indigo-700"
              >
                <Wallet className="h-4 w-4" /> Set Opening Balance
              </button>
            )}
  
            <button
              onClick={() => !isClosed && setShowDebitModal(true)}
              disabled={isClosed}
              className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                isClosed
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              <Minus className="h-4 w-4" /> Cash Out
            </button>
  
            <button
              onClick={() => !isClosed && setShowCreditModal(true)}
              disabled={isClosed}
              className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                isClosed
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              <Plus className="h-4 w-4" /> Cash In
            </button>
  
            <button
              onClick={() => !isClosed && setShowTransferModal(true)}
              disabled={isClosed}
              className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                isClosed
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              }`}
            >
              <ArrowRightLeft className="h-4 w-4" /> Cash Transfer
            </button>
  
            <button
              onClick={exportCSV}
              className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700"
            >
              <Download className="h-4 w-4" /> CSV
            </button>
          </div>
        </div>
  
        {/* Summary */}
        <div className="bg-white rounded-lg shadow border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
            {/* OPENING BALANCE */}
            <div>
              <p className="text-sm text-gray-600">Opening Balance</p>
              <p className="text-xl font-bold text-indigo-600">
                {openingLoaded ? `₹${(transactions[0]?.openingBalance || 0).toFixed(2)}` : "—"}
              </p>
              {openingLoaded && (
                <p className="text-xs text-gray-500">
                  From: {transactions[0]?.openingCarriedFrom}
                </p>
              )}
            </div>
  
            {/* AVAILABLE BALANCE */}
            <div className="flex items-center justify-center gap-2">
              <Wallet className="h-5 w-5 text-blue-700" />
              <div>
                <p className="text-sm text-gray-600 font-medium">Available Balance</p>
                <p className="text-2xl font-bold text-blue-700">
                  ₹{(cashBalance + upiBalance).toFixed(2)}
                </p>
              </div>
            </div>
  
            {/* CASH */}
            <div>
              <p className="text-sm text-gray-600">Cash</p>
              <p className={`text-xl font-bold ${cashBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                ₹{cashBalance.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                In: ₹{(cashCredit || 0).toFixed(2)} | Out: ₹{(cashDebit || 0).toFixed(2)}
              </p>
            </div>
  
            {/* UPI */}
            <div>
              <p className="text-sm text-gray-600">UPI</p>
              <p className={`text-xl font-bold ${upiBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                ₹{upiBalance.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                In: ₹{(upiCredit || 0).toFixed(2)} | Out: ₹{(upiDebit || 0).toFixed(2)}
              </p>
            </div>
  
            {/* CLOSING BALANCE */}
            <div>
              <p className="text-sm text-gray-600">Closing Balance</p>
              <p className="text-xl font-bold text-purple-600">
                {isClosed ? `₹${closingBalance.toFixed(2)}` : "—"}
              </p>
              {isClosed && (
                <p className="text-xs text-gray-500">
                  Cash: ₹{closingCash.toFixed(2)} | UPI: ₹{closingUPI.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
  
        {/* LEDGER */}
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          {Object.keys(grouped).length === 0 ? (
            <p className="p-6 text-center text-gray-500">No transactions for this date.</p>
          ) : (
            Object.entries(grouped).map(([category, data]) => {
              const isOpen = expandedGroups[category] ?? true;
              const debitTotal = data.debit.reduce((s, t) => s + t.amount, 0);
              const creditTotal = data.credit.reduce((s, t) => s + t.amount, 0);
              const maxRows = Math.max(data.debit.length, data.credit.length, 1);
  
              return (
                <div key={category} className="border-b last:border-b-0">
                  <button
                    onClick={() => toggleGroup(category)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-semibold text-sm">{category}</span>
                    </div>
                    <div className="flex gap-6 text-xs">
                      <span className="text-red-700">Debit: ₹{debitTotal.toFixed(2)}</span>
                      <span className="text-green-700">Credit: ₹{creditTotal.toFixed(2)}</span>
                    </div>
                  </button>
  
                  {isOpen && (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 font-medium">
                          <th className="px-4 py-1.5 text-left w-28">Time</th>
                          <th className="px-4 py-1.5 text-left">Particulars</th>
                          <th className="px-4 py-1.5 text-right w-24">Debit</th>
                          <th className="px-4 py-1.5 text-left w-28">Time</th>
                          <th className="px-4 py-1.5 text-left">Particulars</th>
                          <th className="px-4 py-1.5 text-right w-24">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: maxRows }, (_, i) => {
                          const debit = data.debit[i];
                          const credit = data.credit[i];
                          return (
                            <tr
                              key={i}
                              className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}
                            >
                              <td className="px-4 py-1.5 text-gray-600">
                                {debit
                                  ? new Date(debit.createdAt).toLocaleTimeString("en-IN", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : ""}
                              </td>
                              <td className="px-4 py-1.5">
                                {debit ? (
                                  <button
                                    onClick={() => setSelectedTx(debit)}
                                    className="text-left w-full group"
                                  >
                                    <div className="font-medium text-red-700 group-hover:underline">
                                      {debit.paymentMethod === "UPI" ? "UPI " : ""}
                                      {debit.description}
                                    </div>
                                    {debit.notes && (
                                      <div className="text-xs text-gray-500 truncate max-w-xs">
                                        {debit.notes}
                                      </div>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-4 py-1.5 text-right font-medium text-red-700">
                                {debit ? `₹${debit.amount.toFixed(2)}` : ""}
                              </td>
  
                              <td className="px-4 py-1.5 text-gray-600">
                                {credit
                                  ? new Date(credit.createdAt).toLocaleTimeString("en-IN", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : ""}
                              </td>
                              <td className="px-4 py-1.5">
                                {credit ? (
                                  <button
                                    onClick={() => setSelectedTx(credit)}
                                    className="text-left w-full group"
                                  >
                                    <div className="font-medium text-green-700 group-hover:underline">
                                      {credit.category === "Opening Balance"
                                        ? "Opening Balance"
                                        : credit.category === "Manual Credit"
                                        ? "Manual Credit"
                                        : "Income"}
                                      {credit.paymentMethod === "UPI" ? " (UPI)" : ""}
                                    </div>
                                    {credit.notes && (
                                      <div className="text-xs text-gray-500 truncate max-w-xs">
                                        {credit.notes}
                                      </div>
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-4 py-1.5 text-right font-medium text-green-700">
                                {credit ? `₹${credit.amount.toFixed(2)}` : ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })
          )}
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-3 font-bold text-sm">
            <div className="flex justify-between">
              <span>Total Debit: <span className="text-red-700 text-lg">₹{totalDebit.toFixed(2)}</span></span>
              <span>Total Credit: <span className="text-green-700 text-lg">₹{totalCredit.toFixed(2)}</span></span>
            </div>
          </div>
        </div>
  
        {/* CLOSE / UNDO BUTTON WITH 45-MIN LOGIC */}
        <div className="mt-6 flex justify-center">
          {!isClosed ? (
            <button
              onClick={() => setShowClosingModal(true)}
              className="flex items-center gap-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 text-lg font-semibold"
            >
              <Lock className="h-5 w-5" /> Create Closing Balance
            </button>
          ) : (
            (() => {
              const closedAt = transactions[0]?.closedAt;
              const now = new Date();
              const diffMins = closedAt ? (now - new Date(closedAt)) / (1000 * 60) : Infinity;
  
              const canUndo = diffMins <= 45;
  
              return canUndo ? (
                <button
                  onClick={undoClose}
                  className="flex items-center gap-1 bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700 text-lg font-semibold"
                >
                  <Unlock className="h-5 w-5" /> Undo Closing ({Math.floor(45 - diffMins)} min left)
                </button>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <Lock className="h-5 w-5" />
                  <span className="text-lg font-medium">Day Closed (Undo expired)</span>
                </div>
              );
            })()
          )}
        </div>
      </div>
  
      {/* ====================== MODALS ====================== */}
  
      {/* CLOSING CONFIRMATION MODAL */}
      {showClosingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Confirm Closing Balance</h3>
            <div className="space-y-3 text-sm">
              <p>Closing for: <strong>{selectedDate}</strong></p>
              <p>Cash Balance: <strong className={cashBalance >= 0 ? "text-green-600" : "text-red-600"}>₹{cashBalance.toFixed(2)}</strong></p>
              <p>UPI Balance: <strong className={upiBalance >= 0 ? "text-green-600" : "text-red-600"}>₹{upiBalance.toFixed(2)}</strong></p>
              <p className="font-bold text-lg text-purple-600">
                Total Closing: ₹{(cashBalance + upiBalance).toFixed(2)}
              </p>
              <p className="text-xs text-amber-600">This action cannot be undone after 45 minutes.</p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowClosingModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  closeDay();
                  setShowClosingModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPENING BALANCE MODAL */}
      {showOpeningModal && prevClosing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Set Opening Balance</h3>
            <div className="space-y-3 text-sm">
              <p>Carry forward from: <strong>{prevClosing.date}</strong></p>
              <p>Cash: <strong>₹{prevClosing.cash.toFixed(2)}</strong></p>
              <p>UPI: <strong>₹{prevClosing.upi.toFixed(2)}</strong></p>
              <p className="font-bold text-lg text-indigo-600">
                Total: ₹{prevClosing.total.toFixed(2)}
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowOpeningModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={setOpeningBalance}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Confirm & Set
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEBIT MODAL */}
      {showDebitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Add Expense</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={debitForm.amount}
                  onChange={(e) => setDebitForm({ ...debitForm, amount: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500"
                />
                {debitForm.amount &&
                  parseFloat(debitForm.amount) >
                    (debitForm.paymentMethod === "Cash" ? cashBalance : upiBalance) && (
                    <p className="text-xs text-red-600 mt-1">
                      Available {debitForm.paymentMethod}: ₹
                      {(debitForm.paymentMethod === "Cash" ? cashBalance : upiBalance).toFixed(2)}
                    </p>
                  )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={debitForm.category}
                  onChange={(e) => setDebitForm({ ...debitForm, category: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">-- Select --</option>
                  {CATEGORY_OPTIONS.filter((c) => c !== "Manual Credit").map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Source</label>
                <div className="flex gap-6">
                  {["Cash", "UPI"].map((m) => (
                    <label key={m} className="flex items-center">
                      <input
                        type="radio"
                        name="method"
                        value={m}
                        checked={debitForm.paymentMethod === m}
                        onChange={(e) => setDebitForm({ ...debitForm, paymentMethod: e.target.value })}
                        className="mr-2"
                      />
                      <span className="font-medium">
                        {m} (₹{(m === "Cash" ? cashBalance : upiBalance).toFixed(2)})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={debitForm.notes}
                  onChange={(e) => setDebitForm({ ...debitForm, notes: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Any extra info..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDebitModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={submitDebit}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Add Debit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREDIT MODAL */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Add Manual Credit</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={creditForm.amount}
                  onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Method</label>
                <div className="flex gap-6">
                  {["Cash", "UPI"].map((m) => (
                    <label key={m} className="flex items-center">
                      <input
                        type="radio"
                        name="creditMethod"
                        value={m}
                        checked={creditForm.paymentMethod === m}
                        onChange={(e) => setCreditForm({ ...creditForm, paymentMethod: e.target.value })}
                        className="mr-2"
                      />
                      <span className="font-medium">{m}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={creditForm.notes}
                  onChange={(e) => setCreditForm({ ...creditForm, notes: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreditModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={submitCredit}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Add Credit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Transfer Balance</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500"
                />
                {transferForm.amount &&
                  parseFloat(transferForm.amount) >
                    (transferForm.from === "Cash" ? cashBalance : upiBalance) && (
                    <p className="text-xs text-red-600 mt-1">
                      Available {transferForm.from}: ₹
                      {(transferForm.from === "Cash" ? cashBalance : upiBalance).toFixed(2)}
                    </p>
                  )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">From</label>
                  <select
                    value={transferForm.from}
                    onChange={(e) => {
                      const newFrom = e.target.value;
                      const newTo = newFrom === "Cash" ? "UPI" : "Cash";
                      setTransferForm({ ...transferForm, from: newFrom, to: newTo });
                    }}
                    className="w-full border rounded-md px-3 py-2"
                  >
                    <option value="Cash">Cash (₹{cashBalance.toFixed(2)})</option>
                    <option value="UPI">UPI (₹{upiBalance.toFixed(2)})</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">To</label>
                  <select
                    value={transferForm.to}
                    disabled
                    className="w-full border rounded-md px-3 py-2 bg-gray-50"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={submitTransfer}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Transaction Details</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Type:</strong> {selectedTx.type === "debit" ? "Expense" : "Income"}</p>
              <p><strong>Method:</strong> {selectedTx.paymentMethod}</p>
              <p><strong>Amount:</strong> ₹{selectedTx.amount.toFixed(2)}</p>
              <p><strong>Category:</strong> {selectedTx.category}</p>
              <p><strong>Description:</strong> {selectedTx.description}</p>
              {selectedTx.notes && <p><strong>Notes:</strong> {selectedTx.notes}</p>}
              <p><strong>Time:</strong> {new Date(selectedTx.createdAt).toLocaleString()}</p>
              {selectedTx.user && (
                <p><strong>User:</strong> {selectedTx.user.name} ({selectedTx.user.phone})</p>
              )}
            </div>
            <button
              onClick={() => setSelectedTx(null)}
              className="mt-4 w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyTransactions;