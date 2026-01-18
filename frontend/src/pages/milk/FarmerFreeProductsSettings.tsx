import { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/settingsAPI';
import { productAPI } from '../../services/productAPI';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  unit?: string;
}

interface FreeProductItem {
  product_id: string;
  quantity: number;
  unit: string;
}

export const FarmerFreeProductsSettings = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [freeProducts, setFreeProducts] = useState<FreeProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load products
      const productsData = await productAPI.getAll();
      setProducts(productsData || []);
      
      // Load free products settings
      try {
        const settings = await settingsAPI.getSetting('farmer_default_free_products');
        if (settings?.value) {
          const parsed = JSON.parse(settings.value);
          setFreeProducts(Array.isArray(parsed) ? parsed : []);
        } else {
          setFreeProducts([]);
        }
      } catch (error) {
        // Setting doesn't exist yet, use empty array
        setFreeProducts([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    if (products.length === 0) {
      alert('No products available. Please add products first.');
      return;
    }
    setFreeProducts([...freeProducts, { product_id: '', quantity: 0, unit: 'piece' }]);
  };

  const handleRemoveProduct = (index: number) => {
    setFreeProducts(freeProducts.filter((_, i) => i !== index));
  };

  const handleUpdateProduct = (index: number, field: keyof FreeProductItem, value: any) => {
    const newProducts = [...freeProducts];
    newProducts[index] = { ...newProducts[index], [field]: value };
    
    // Auto-set unit when product is selected
    if (field === 'product_id' && value) {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        newProducts[index].unit = selectedProduct.unit || 'piece';
      }
    }
    
    setFreeProducts(newProducts);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (freeProducts.some(item => !item.product_id || item.quantity <= 0)) {
      alert('Please fill all product details correctly');
      return;
    }

    try {
      setSaving(true);
      await settingsAPI.updateSetting('farmer_default_free_products', JSON.stringify(freeProducts));
      alert('Dairy collector free products settings updated successfully!');
      navigate('/milk');
    } catch (error: any) {
      console.error('Failed to update settings:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update settings';
      if (error.response?.status === 403) {
        alert('Access denied: You need ADMIN role to update settings. Please contact your administrator.');
      } else {
        alert(errorMessage);
      }
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
        <h1 className="text-2xl font-bold text-gray-900">Dairy Collector Free Products Settings</h1>
      </div>

      <div className="card max-w-3xl">
        <form onSubmit={handleSave}>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Configure default free products that will be given to all dairy collectors monthly. 
                These products will be deducted from inventory automatically.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">Free Products</label>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
              </div>

              <div className="space-y-3">
                {freeProducts.length > 0 ? (
                  freeProducts.map((item, index) => {
                    const selectedProduct = products.find(p => p.id === item.product_id);
                    return (
                      <div key={index} className="flex gap-3 items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <select
                          required
                          value={item.product_id}
                          onChange={(e) => handleUpdateProduct(index, 'product_id', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">Select Product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="0"
                          value={item.quantity || ''}
                          onChange={(e) => handleUpdateProduct(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Qty"
                        />
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleUpdateProduct(index, 'unit', e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Unit"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove product"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                    No products added. Click "Add Product" to start.
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-3">
                These products will be automatically assigned to all dairy collectors each month. 
                You can also manually assign different products to specific collectors when generating their paysheet.
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
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

