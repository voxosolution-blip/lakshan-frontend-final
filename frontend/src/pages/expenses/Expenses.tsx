import { useState, useEffect } from 'react';
import { expensesAPI, type Expense, type CreateExpenseData } from '../../services/expensesAPI';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit, Trash2, DollarSign, Calendar, TrendingUp } from 'lucide-react';

export const Expenses = () => {
  const { user } = useAuth();
  const isSalesperson = user?.role === 'SALESPERSON';
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [formData, setFormData] = useState<CreateExpenseData>({
    category: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadExpenses();
    
    // Refresh when window gains focus (user switches back to tab)
    const handleFocus = () => {
      loadExpenses();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await expensesAPI.getAll();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load expenses:', error);
      setExpenses([]);
      alert('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || formData.amount <= 0) {
      alert('Please fill all required fields');
      return;
    }

    try {
      if (selectedExpense) {
        await expensesAPI.update(selectedExpense.id, formData);
      } else {
        await expensesAPI.create(formData);
      }
      setShowModal(false);
      setSelectedExpense(null);
      setFormData({ category: '', amount: 0, date: new Date().toISOString().split('T')[0] });
      loadExpenses();
    } catch (error) {
      console.error('Failed to save expense:', error);
      alert('Failed to save expense');
    }
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    const amount = typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount?.toString() || '0') || 0;
    setFormData({
      category: expense.category,
      amount: amount,
      description: expense.description,
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await expensesAPI.delete(id);
      loadExpenses();
    } catch (error: any) {
      console.error('Failed to delete expense:', error);
      alert(error.response?.data?.message || 'Failed to delete expense');
    }
  };

  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const categories = Array.from(new Set(safeExpenses.map(e => e.category)));
  const filteredExpenses = filterCategory === 'all' 
    ? safeExpenses 
    : safeExpenses.filter(e => e.category === filterCategory);

  const totalExpenses = filteredExpenses.reduce((sum, e) => {
    const amount = typeof e.amount === 'number' ? e.amount : parseFloat(e.amount?.toString() || '0') || 0;
    return sum + amount;
  }, 0);
  const thisMonthExpenses = safeExpenses
    .filter(e => {
      const expenseDate = new Date(e.date);
      const now = new Date();
      return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => {
      const amount = typeof e.amount === 'number' ? e.amount : parseFloat(e.amount?.toString() || '0') || 0;
      return sum + amount;
    }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      <div className="flex justify-end items-center">
        <button
          onClick={() => {
            setSelectedExpense(null);
            setFormData({ category: '', amount: 0, date: new Date().toISOString().split('T')[0] });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2 text-sm md:text-base py-2 md:py-2.5 px-3 md:px-4"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Expense</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <div className="card p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">Total Expenses</p>
              <p className="text-xl md:text-3xl font-bold text-gray-900">Rs. {totalExpenses.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 md:w-12 md:h-12 text-red-500 flex-shrink-0" />
          </div>
        </div>
        <div className="card p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">This Month</p>
              <p className="text-xl md:text-3xl font-bold text-gray-900">Rs. {thisMonthExpenses.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 md:w-12 md:h-12 text-blue-500 flex-shrink-0" />
          </div>
        </div>
        <div className="card p-4 md:p-6 sm:col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600 mb-1">Total Records</p>
              <p className="text-xl md:text-3xl font-bold text-gray-900">{safeExpenses.length}</p>
            </div>
            <Calendar className="w-8 h-8 md:w-12 md:h-12 text-green-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="card p-3 md:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
          <label className="text-xs md:text-sm font-medium text-gray-700">Filter by Category:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input text-sm md:text-base"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="card hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-700">Date</th>
                <th className="text-left p-4 font-semibold text-gray-700">Category</th>
                <th className="text-left p-4 font-semibold text-gray-700">Description</th>
                {!isSalesperson && (
                  <th className="text-left p-4 font-semibold text-gray-700">Salesperson</th>
                )}
                <th className="text-right p-4 font-semibold text-gray-700">Amount</th>
                <th className="text-center p-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(filteredExpenses) && filteredExpenses.map((expense) => {
                const canEdit = isSalesperson ? expense.createdBy === user?.id : true;
                return (
                  <tr key={expense.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        {new Date(expense.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {expense.category}
                      </span>
                    </td>
                    <td className="p-4">{expense.description || '-'}</td>
                    {!isSalesperson && (
                      <td className="p-4">
                        <span className="text-sm text-gray-600">
                          {expense.salespersonName || expense.salespersonUsername || 'Admin'}
                        </span>
                      </td>
                    )}
                    <td className="p-4 text-right font-semibold text-red-600">
                      Rs. {(typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount?.toString() || '0') || 0).toFixed(2)}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleEdit(expense)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {!canEdit && (
                          <span className="text-xs text-gray-400">View only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(!Array.isArray(filteredExpenses) || filteredExpenses.length === 0) && (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No expenses found</p>
              <p className="text-gray-400 text-sm mt-2">Record your first expense</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {(!Array.isArray(filteredExpenses) || filteredExpenses.length === 0) ? (
          <div className="card text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-base">No expenses found</p>
            <p className="text-gray-400 text-sm mt-2">Record your first expense</p>
          </div>
        ) : (
          filteredExpenses.map((expense) => {
            const canEdit = isSalesperson ? expense.createdBy === user?.id : true;
            return (
              <div key={expense.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(expense.date).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                      {expense.category}
                    </span>
                    {expense.description && (
                      <p className="text-sm text-gray-600 mt-2">{expense.description}</p>
                    )}
                    {!isSalesperson && (
                      <p className="text-xs text-gray-500 mt-2">
                        Salesperson: {expense.salespersonName || expense.salespersonUsername || 'Admin'}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">
                      Rs. {(typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount?.toString() || '0') || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
                {!canEdit && (
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400 text-center block">View only</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <ExpenseModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowModal(false);
            setSelectedExpense(null);
            setFormData({ category: '', amount: 0, date: new Date().toISOString().split('T')[0] });
          }}
          editing={!!selectedExpense}
          isSalesperson={isSalesperson}
        />
      )}
    </div>
  );
};

// Expense Modal Component
const ExpenseModal = ({
  formData,
  setFormData,
  onSubmit,
  onClose,
  editing,
  isSalesperson = false
}: {
  formData: CreateExpenseData;
  setFormData: (data: CreateExpenseData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  editing: boolean;
  isSalesperson?: boolean;
}) => {
  const expenseCategories = isSalesperson
    ? [
        'Fuel',
        'Maintenance',
        'Other'
      ]
    : [
        'Utilities',
        'Transport',
        'Raw Materials',
        'Packaging',
        'Labor',
        'Maintenance',
        'Marketing',
        'Office Supplies',
        'Other'
      ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg md:text-2xl font-bold mb-4 md:mb-6">{editing ? 'Edit' : 'New'} Expense</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Category *</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full input"
            >
              <option value="">Select Category</option>
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Amount (Rs.) *</label>
            <input
              type="number"
              step="0.01"
              required
              min="0.01"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              className="w-full input"
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Date *</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full input"
              rows={3}
              placeholder="Expense description (optional)"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
            <button type="button" onClick={onClose} className="btn-secondary py-2.5 text-sm md:text-base">
              Cancel
            </button>
            <button type="submit" className="btn-primary py-2.5 text-sm md:text-base">
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
