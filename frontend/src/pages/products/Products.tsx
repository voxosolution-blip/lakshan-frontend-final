import { useState, useEffect } from 'react';
import { productAPI } from '../../services/productAPI';
import { inventoryAPI } from '../../services/inventoryAPI';
import type { Product, CreateProductData, ProductBOM, CreateBOMData } from '../../types';
import type { InventoryItem } from '../../services/inventoryAPI';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

export const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBOMModal, setShowBOMModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bomItems, setBomItems] = useState<ProductBOM[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProducts();
    loadInventoryItems();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productAPI.getAll();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load products:', error);
      setProducts([]);
      alert(error.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryItems = async () => {
    try {
      const response = await inventoryAPI.getAll();
      setInventoryItems(response.data.data || []);
    } catch (error) {
      console.error('Failed to load inventory items:', error);
    }
  };

  const loadBOM = async (productId: string) => {
    try {
      const data = await productAPI.getBOM(productId);
      setBomItems(data);
    } catch (error) {
      console.error('Failed to load BOM:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await productAPI.delete(id);
      loadProducts();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const filteredProducts = (Array.isArray(products) ? products : []).filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
        <button
          onClick={() => {
            setSelectedProduct(null);
            setShowAddModal(true);
          }}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto"
        >
          <PlusIcon className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field"
        />
      </div>

      {/* Products Table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No products found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      {product.description && (
                        <div className="text-xs text-gray-500 mt-1">{product.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.category && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {product.category}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rs. {product.sellingPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          product.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={async () => {
                            setSelectedProduct(product);
                            await loadBOM(product.id);
                            setShowBOMModal(true);
                          }}
                          className="text-purple-600 hover:text-purple-900"
                          title="View/Edit BOM"
                        >
                          <BeakerIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowAddModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showAddModal && (
        <ProductModal
          product={selectedProduct}
          onClose={() => {
            setShowAddModal(false);
            setSelectedProduct(null);
          }}
          onSave={loadProducts}
        />
      )}

      {/* BOM Modal */}
      {showBOMModal && selectedProduct && (
        <BOMModal
          product={selectedProduct}
          bomItems={bomItems}
          inventoryItems={inventoryItems}
          onClose={() => {
            setShowBOMModal(false);
            setSelectedProduct(null);
            setBomItems([]);
          }}
          onSave={async () => {
            if (selectedProduct) {
              await loadBOM(selectedProduct.id);
            }
          }}
        />
      )}
    </div>
  );
};

// Product Modal Component
const ProductModal = ({
  product,
  onClose,
  onSave,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: () => void;
}) => {
  const [formData, setFormData] = useState<CreateProductData>({
    name: product?.name || '',
    category: product?.category || '',
    sellingPrice: product?.sellingPrice || 0,
    description: product?.description || '',
    isActive: product?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (product) {
        await productAPI.update(product.id, formData);
      } else {
        await productAPI.create(formData);
      }
      onSave();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{product ? 'Edit' : 'Add'} Product</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
                placeholder="e.g., Yoghurt, Cheese"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.sellingPrice || ''}
                onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                className="input-field"
                placeholder="Enter price"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              rows={3}
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive ?? true}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// BOM Modal Component
const BOMModal = ({
  product,
  bomItems,
  inventoryItems,
  onClose,
  onSave,
}: {
  product: Product;
  bomItems: ProductBOM[];
  inventoryItems: InventoryItem[];
  onClose: () => void;
  onSave: () => void;
}) => {
  const [showAddBOM, setShowAddBOM] = useState(false);
  const [newBOM, setNewBOM] = useState<CreateBOMData>({
    inventoryItemId: '',
    quantityRequired: 0,
    unit: '',
  });
  const [loading, setLoading] = useState(false);

  const handleAddBOM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBOM.inventoryItemId || newBOM.quantityRequired <= 0) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await productAPI.addBOMItem(product.id, newBOM);
      setNewBOM({ inventoryItemId: '', quantityRequired: 0, unit: '' });
      setShowAddBOM(false);
      onSave();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add BOM item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBOM = async (bomId: string) => {
    if (!confirm('Remove this item from BOM?')) return;
    try {
      await productAPI.deleteBOMItem(product.id, bomId);
      onSave();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete BOM item');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold">BOM - {product.name}</h2>
            <p className="text-sm text-gray-600">Bill of Materials (Recipe)</p>
          </div>
          <button
            onClick={() => setShowAddBOM(!showAddBOM)}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add Item
          </button>
        </div>

        {showAddBOM && (
          <form onSubmit={handleAddBOM} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inventory Item *</label>
                <select
                  required
                  value={newBOM.inventoryItemId}
                  onChange={(e) => {
                    const item = inventoryItems.find((i) => i.id === e.target.value);
                    setNewBOM({
                      ...newBOM,
                      inventoryItemId: e.target.value,
                      unit: item?.unit || '',
                    });
                  }}
                  className="input-field"
                >
                  <option value="">Select item</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Required *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={newBOM.quantityRequired || ''}
                  onChange={(e) =>
                    setNewBOM({ ...newBOM, quantityRequired: parseFloat(e.target.value) || 0 })
                  }
                  className="input-field"
                  placeholder="Enter quantity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit (Auto from Inventory)</label>
                <input
                  type="text"
                  value={newBOM.unit}
                  className="input-field bg-gray-100"
                  readOnly
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unit automatically matches inventory item
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Adding...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddBOM(false);
                  setNewBOM({ inventoryItemId: '', quantityRequired: 0, unit: '' });
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bomItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No BOM items. Add items to create the recipe.
                  </td>
                </tr>
              ) : (
                bomItems.map((bom) => (
                  <tr key={bom.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {bom.inventoryItem?.name || 'Unknown Item'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{bom.quantityRequired}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{bom.unit}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteBOM(bom.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};


