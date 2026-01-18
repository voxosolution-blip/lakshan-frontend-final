import { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/settingsAPI';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MilkSettings = () => {
  const navigate = useNavigate();
  const [price, setPrice] = useState<number>(200);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrice();
  }, []);

  const loadPrice = async () => {
    try {
      setLoading(true);
      const data = await settingsAPI.getMilkPrice();
      setPrice(data.price);
    } catch (error) {
      console.error('Failed to load milk price:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    try {
      setSaving(true);
      await settingsAPI.updateMilkPrice(price);
      alert('Milk price updated successfully!');
      navigate('/milk');
    } catch (error: any) {
      console.error('Failed to update milk price:', error);
      alert(error.response?.data?.message || 'Failed to update milk price');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/milk')}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Milk Price Settings</h1>
      </div>

      <div className="card max-w-md">
        <form onSubmit={handleSave}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Milk Price per Liter
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Rs.</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price || ''}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="flex-1 input text-lg font-semibold"
                  required
                  placeholder="Enter price"
                />
                <span className="text-gray-600">per Liter</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                This price will be used for all farmers' payment calculations
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => navigate('/milk')}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="flex-1 btn-primary flex items-center justify-center gap-2" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Update Price'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};






