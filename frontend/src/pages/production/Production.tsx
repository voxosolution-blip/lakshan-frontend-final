import { useState, useEffect } from 'react';
import { productAPI } from '../../services/productAPI';
import { productionAPI, type ProductionCapacity } from '../../services/productionAPI';
import { inventoryAPI, type InventoryItem } from '../../services/inventoryAPI';
import { authAPI } from '../../services/api';
import { Plus, Calculator, Package, Settings, Users, TrendingUp, Edit, Trash2, Beaker, MoreVertical } from 'lucide-react';
import { setupHourlyRefresh } from '../../utils/hourlyRefresh';
import { formatNumber, formatNumberDecimals } from '../../utils/numberFormat';

interface Product {
  id: string;
  name: string;
  category: string;
  selling_price: number;
  is_active: boolean;
}

interface ProductBOM {
  id: string;
  inventory_item_id: string;
  quantity_required: number;
  unit: string;
  inventory_item_name?: string;
}

export const Production = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [capacity, setCapacity] = useState<ProductionCapacity[]>([]);
  const [todayProduction, setTodayProduction] = useState<any[]>([]);
  const [todayProductionWithAllocations, setTodayProductionWithAllocations] = useState<any[]>([]);
  const [productions, setProductions] = useState<any[]>([]);
  const [salespersons, setSalespersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Product Management
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: '',
    selling_price: '',
    is_active: true
  });
  
  // Set Ingredients Modal
  const [showBOMModal, setShowBOMModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productBOM, setProductBOM] = useState<ProductBOM[]>([]);
  const [bomForm, setBomForm] = useState({
    inventory_item_id: '',
    quantity_required: '',
    unit: ''
  });
  
  // Production Entry
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [productionForm, setProductionForm] = useState({
    productId: '',
    date: new Date().toISOString().split('T')[0],
    quantityProduced: '',
    notes: ''
  });
  
  // Sales Allocation
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showBulkAllocationModal, setShowBulkAllocationModal] = useState(false);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [allocationForm, setAllocationForm] = useState({
    productionId: '',
    productId: '',
    inventoryItemId: '', // For inventory-based allocations
    allocationType: 'production' as 'production' | 'inventory', // New field to distinguish allocation source
    salespersonId: '',
    quantityAllocated: '',
    notes: ''
  });
  const [bulkAllocations, setBulkAllocations] = useState<Array<{
    productionId: string;
    productId: string;
    productName: string;
    salespersonId: string;
    quantity: string;
    batch: string;
  }>>([]);

  useEffect(() => {
    loadData();
    const cleanup = setupHourlyRefresh(loadData);
    return cleanup;
  }, []);

  // Auto-select salesperson when salespersons are loaded (if only one exists)
  useEffect(() => {
    if (salespersons.length === 1) {
      setAllocationForm(prev => ({
        ...prev,
        salespersonId: salespersons[0].id
      }));
    }
  }, [salespersons]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, inventoryData, capacityData, todayData, todayWithAllocations, productionsData, salespersonsResponse] = await Promise.all([
        productAPI.getAll().catch(() => []),
        inventoryAPI.getAll().then(r => r.data.data || []).catch(() => []),
        productionAPI.getCapacity().catch(() => []),
        productionAPI.getTodayProduction().catch(() => []),
        productionAPI.getTodayProductionWithAllocations().catch(() => []),
        productionAPI.getAll().catch(() => []),
        authAPI.getSalespersons().then(r => {
          const data = r.data.data || [];
          console.log('Loaded salespersons:', data);
          return data;
        }).catch((err) => {
          console.error('Failed to load salespersons:', err);
          return [];
        })
      ]);
      
      setProducts(Array.isArray(productsData) ? productsData : []);
      setInventoryItems(Array.isArray(inventoryData) ? inventoryData : []);
      setCapacity(Array.isArray(capacityData) ? capacityData : []);
      setTodayProduction(Array.isArray(todayData) ? todayData : []);
      setTodayProductionWithAllocations(Array.isArray(todayWithAllocations) ? todayWithAllocations : []);
      setProductions(Array.isArray(productionsData) ? productionsData : []);
      const salespersonsList = Array.isArray(salespersonsResponse) ? salespersonsResponse : [];
      setSalespersons(salespersonsList);
      console.log('Salespersons set:', salespersonsList);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.selling_price) {
      alert('Please fill all required fields');
      return;
    }

    try {
      if (editingProduct) {
        // Update existing product
        await productAPI.update(editingProduct.id, {
          name: productForm.name,
          category: productForm.category || undefined,
          selling_price: parseFloat(productForm.selling_price),
          is_active: productForm.is_active
        });
      } else {
        // Create new product
      await productAPI.create({
        name: productForm.name,
        category: productForm.category || undefined,
        selling_price: parseFloat(productForm.selling_price),
        is_active: productForm.is_active
      });
      }
      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({ name: '', category: '', selling_price: '', is_active: true });
      loadData();
    } catch (error: any) {
      console.error('Failed to save product:', error);
      alert(error.response?.data?.message || 'Failed to save product');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      category: product.category || '',
      selling_price: product.selling_price?.toString() || '',
      is_active: product.is_active
    });
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await productAPI.delete(product.id);
      loadData();
      alert('Product deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      alert(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleSetIngredients = async (product: Product) => {
    setSelectedProduct(product);
    try {
      const bom = await productAPI.getBOM(product.id);
      setProductBOM(bom);
      setShowBOMModal(true);
    } catch (error) {
      console.error('Failed to load BOM:', error);
      setProductBOM([]);
      setShowBOMModal(true);
    }
  };

  const handleAddBOMItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !bomForm.inventory_item_id || !bomForm.quantity_required) {
      alert('Please fill all required fields');
      return;
    }

    // Get the selected inventory item to use its unit
    const selectedItem = inventoryItems.find(item => item.id === bomForm.inventory_item_id);
    const unitToUse = selectedItem?.unit || bomForm.unit || 'piece';

    try {
      await productAPI.addBOMItem(selectedProduct.id, {
        inventory_item_id: bomForm.inventory_item_id,
        quantity_required: parseFloat(bomForm.quantity_required),
        unit: unitToUse
      });
      setBomForm({ inventory_item_id: '', quantity_required: '', unit: '' });
      const bom = await productAPI.getBOM(selectedProduct.id);
      setProductBOM(bom);
      loadData(); // Reload capacity
    } catch (error: any) {
      console.error('Failed to add BOM item:', error);
      alert(error.response?.data?.message || 'Failed to add ingredient');
    }
  };

  const handleDeleteBOMItem = async (bomId: string) => {
    if (!selectedProduct) return;
    if (!confirm('Are you sure you want to remove this ingredient?')) return;

    try {
      await productAPI.deleteBOMItem(selectedProduct.id, bomId);
      const bom = await productAPI.getBOM(selectedProduct.id);
      setProductBOM(bom);
      loadData();
    } catch (error: any) {
      console.error('Failed to delete BOM item:', error);
      alert(error.response?.data?.message || 'Failed to remove ingredient');
    }
  };

  const handleCreateProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productionForm.productId || !productionForm.quantityProduced) {
      alert('Please select product and enter quantity');
      return;
    }

    try {
      await productionAPI.create({
        productId: productionForm.productId,
        date: productionForm.date,
        quantityProduced: parseFloat(productionForm.quantityProduced),
        notes: productionForm.notes || undefined
      });
      setShowProductionModal(false);
      setProductionForm({
        productId: '',
        date: new Date().toISOString().split('T')[0],
        quantityProduced: '',
        notes: ''
      });
      loadData();
      // Dispatch event to notify other pages (like inventory) about production update
      window.dispatchEvent(new CustomEvent('productionUpdated'));
      alert('Production created successfully! Inventory deducted automatically.');
    } catch (error: any) {
      console.error('Failed to create production:', error);
      alert(error.response?.data?.message || 'Failed to create production');
    }
  };

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasProduction = allocationForm.allocationType === 'production' && allocationForm.productionId;
    const hasInventory = allocationForm.allocationType === 'inventory' && allocationForm.inventoryItemId;
    
    if ((!hasProduction && !hasInventory) || !allocationForm.productId || !allocationForm.salespersonId || !allocationForm.quantityAllocated) {
      alert('Please fill all required fields');
      return;
    }

    try {
      await productionAPI.createAllocation({
        productionId: allocationForm.allocationType === 'production' ? allocationForm.productionId : undefined,
        inventoryItemId: allocationForm.allocationType === 'inventory' ? allocationForm.inventoryItemId : undefined,
        productId: allocationForm.productId,
        salespersonId: allocationForm.salespersonId,
        quantityAllocated: parseFloat(allocationForm.quantityAllocated),
        notes: allocationForm.notes || undefined
      });
      setShowAllocationModal(false);
      setAllocationForm({
        productionId: '',
        productId: '',
        inventoryItemId: '',
        allocationType: 'production',
        salespersonId: '',
        quantityAllocated: '',
        notes: ''
      });
      loadAllocations();
      loadData();
    } catch (error: any) {
      console.error('Failed to create allocation:', error);
      alert(error.response?.data?.message || 'Failed to create allocation');
    }
  };

  const handleBulkAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkAllocations.length === 0) {
      alert('Please add at least one allocation');
      return;
    }

    try {
      const allocationsToSend = bulkAllocations
        .filter(a => a.productionId && a.productId && a.salespersonId && a.quantity)
        .map(a => ({
          productionId: a.productionId,
          productId: a.productId,
          salespersonId: a.salespersonId,
          quantity: parseFloat(a.quantity)
        }));

      if (allocationsToSend.length === 0) {
        alert('Please fill all required fields for at least one allocation');
        return;
      }

      await productionAPI.createBulkAllocation(allocationsToSend);
      setShowBulkAllocationModal(false);
      setBulkAllocations([]);
      loadAllocations();
      loadData();
      alert('Bulk allocation created successfully!');
    } catch (error: any) {
      console.error('Failed to create bulk allocation:', error);
      alert(error.response?.data?.message || 'Failed to create bulk allocation');
    }
  };

  const loadAllocations = async () => {
    try {
      // Load all allocations (not just today's) to show complete history
      const data = await productionAPI.getAllocations();
      const allocationsList = Array.isArray(data) ? data : [];
      setAllocations(allocationsList);
      console.log('Loaded allocations:', allocationsList);
    } catch (error) {
      console.error('Failed to load allocations:', error);
      setAllocations([]);
    }
  };

  useEffect(() => {
    loadAllocations();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading production data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Production Capacity Calculator */}
      {capacity.length > 0 && (
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <Calculator className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Production Capacity Calculator</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            With current stock you can produce:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {capacity.map((item) => (
              <div key={item.productId} className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{item.productName}</p>
                    <p className="text-sm text-gray-600">{item.productCategory}</p>
                  </div>
                  <div className="text-right">
                    {item.maxPossibleUnits > 0 ? (
                      <p className="text-2xl font-bold text-blue-600">{item.maxPossibleUnits}</p>
                    ) : (
                      <p className="text-sm text-red-600">{item.message || 'No stock'}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Management Section */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your products, set ingredients, and configure pricing</p>
          </div>
          <button
            onClick={() => {
              setEditingProduct(null);
              setProductForm({ name: '', category: '', selling_price: '', is_active: true });
              setShowProductModal(true);
            }}
            className="btn-primary flex items-center gap-2 px-4 py-2"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>

        {/* Products Table */}
        {products.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Product Name</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Price</th>
                  <th className="text-center p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="text-center p-4 text-sm font-semibold text-gray-700 uppercase tracking-wider w-64">Actions</th>
              </tr>
            </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{product.name}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600">{product.category || <span className="text-gray-400 italic">-</span>}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-semibold text-gray-900">Rs. {parseFloat(product.selling_price?.toString() || '0').toFixed(2)}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        product.is_active 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleSetIngredients(product)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors border border-purple-200"
                          title="Set Ingredients"
                      >
                          <Beaker className="w-4 h-4" />
                          Ingredients
                      </button>
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-200"
                          title="Edit Product"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors border border-red-200"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        ) : (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Products Found</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first product</p>
            <button
              onClick={() => {
                setEditingProduct(null);
                setProductForm({ name: '', category: '', selling_price: '', is_active: true });
                setShowProductModal(true);
              }}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add Your First Product
            </button>
          </div>
        )}
      </div>

      {/* Daily Production Entry */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Daily Production</h2>
          <button
            onClick={() => {
              setProductionForm({
                productId: '',
                date: new Date().toISOString().split('T')[0],
                quantityProduced: '',
                notes: ''
              });
              setShowProductionModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Production
          </button>
        </div>

        {/* Today's Production Summary with Allocations */}
        {todayProductionWithAllocations.length > 0 && (
          <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-600" />
              Today's Production with Allocations ({new Date().toLocaleDateString()})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-green-200">
                    <th className="text-left p-2 text-sm font-semibold text-gray-700">Product</th>
                    <th className="text-left p-2 text-sm font-semibold text-gray-700">Batch</th>
                    <th className="text-right p-2 text-sm font-semibold text-gray-700">Produced</th>
                    <th className="text-right p-2 text-sm font-semibold text-gray-700">Allocated</th>
                    <th className="text-right p-2 text-sm font-semibold text-gray-700">Remaining</th>
                    <th className="text-center p-2 text-sm font-semibold text-gray-700">Salespersons</th>
                  </tr>
                </thead>
                <tbody>
                  {todayProductionWithAllocations.map((item) => (
                    <tr key={item.production_id} className="border-b border-green-100 hover:bg-green-50">
                      <td className="p-2 font-medium">{item.product_name}</td>
                      <td className="p-2">
                        <span className="px-2 py-1 text-xs font-mono bg-blue-100 text-blue-800 rounded">
                          {item.batch || '-'}
                  </span>
                      </td>
                      <td className="p-2 text-right font-semibold text-green-700">
                        {formatNumber(item.quantity_produced)}
                      </td>
                      <td className="p-2 text-right font-semibold text-blue-700">
                        {formatNumber(item.total_allocated)}
                      </td>
                      <td className="p-2 text-right font-semibold text-orange-700">
                        {formatNumber(item.remaining_quantity)}
                      </td>
                      <td className="p-2 text-center">
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                          {item.salesperson_count || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {todayProductionWithAllocations.some(item => item.allocations && item.allocations.length > 0) && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Allocation Details:</h4>
                {todayProductionWithAllocations.map((item) => (
                  item.allocations && item.allocations.length > 0 && (
                    <div key={item.production_id} className="mb-3 p-3 bg-white rounded border border-green-200">
                      <div className="font-medium text-sm text-gray-900 mb-2">{item.product_name} (Batch: {item.batch})</div>
                      {item.allocations.map((alloc: any, idx: number) => (
                        <div key={idx} className="text-xs text-gray-600 flex justify-between">
                          <span>{alloc.salesperson_name || 'Unknown'}</span>
                          <span className="font-semibold">{alloc.quantity_allocated} units</span>
                </div>
              ))}
            </div>
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sales Allocation Section */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Salesperson Allocations</h2>
          <div className="flex gap-2">
            {salespersons.length > 0 ? (
              <>
          <button
            onClick={() => {
                    // Initialize bulk allocations from today's production
                    // Auto-select salesperson if only one exists
                    const salespersonId = salespersons.length === 1 ? salespersons[0].id : '';
                    const todayProds = todayProductionWithAllocations.filter(p => 
                      parseFloat(p.remaining_quantity || 0) > 0
                    );
                    setBulkAllocations(todayProds.map(p => ({
                      productionId: p.production_id,
                      productId: p.product_id,
                      productName: p.product_name,
                      salespersonId: salespersonId,
                      quantity: '',
                      batch: p.batch || ''
                    })));
                    setShowBulkAllocationModal(true);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Bulk Allocate
                </button>
                <button
                  onClick={() => {
                    // Auto-select salesperson if only one exists
                    const salespersonId = salespersons.length === 1 ? salespersons[0].id : '';
              setAllocationForm({
                productionId: '',
                productId: '',
                      salespersonId: salespersonId,
                quantityAllocated: '',
                notes: ''
              });
              setShowAllocationModal(true);
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
                  Single Allocate
          </button>
              </>
            ) : (
              <div className="text-sm text-yellow-600 bg-yellow-50 px-3 py-2 rounded border border-yellow-200">
                Loading salespersons...
              </div>
            )}
          </div>
        </div>

        {allocations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Product</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Batch</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700">Quantity</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Allocated To</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-center p-3 text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((allocation) => (
                  <tr key={allocation.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{allocation.product_name || allocation.productName || '-'}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 text-xs font-mono bg-blue-100 text-blue-800 rounded">
                        {allocation.batch_number || allocation.batch || allocation.production_batch || '-'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {formatNumber(allocation.quantity_allocated || allocation.quantityAllocated)}
                    </td>
                    <td className="p-3">{allocation.salesperson_name || allocation.allocatedToName || 'Unknown'}</td>
                    <td className="p-3 text-sm text-gray-600">
                      {allocation.allocation_date ? new Date(allocation.allocation_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        allocation.status === 'completed' || allocation.status === 'sold' ? 'bg-green-100 text-green-800' :
                        allocation.status === 'returned' ? 'bg-red-100 text-red-800' :
                        allocation.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {allocation.status || 'active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No sales allocations found</p>
            <p className="text-xs mt-2 text-gray-400">Allocations will appear here after products are allocated to salespersons</p>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h2>
            <form onSubmit={handleAddProduct}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full input-field"
                    placeholder="e.g., Yoghurt 80ml"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Type
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full input-field"
                  >
                    <option value="">Select Type</option>
                    <option value="Yoghurt">Yoghurt</option>
                    <option value="Drink">Yoghurt Drink</option>
                    <option value="Ice">Ice Packet</option>
                    <option value="Ice Cream">Ice Cream</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price (per unit) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productForm.selling_price || ''}
                    onChange={(e) => setProductForm({ ...productForm, selling_price: e.target.value })}
                    className="w-full input-field"
                    required
                    placeholder="Enter price"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={productForm.is_active}
                    onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Active
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductModal(false);
                    setEditingProduct(null);
                    setProductForm({ name: '', category: '', selling_price: '', is_active: true });
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Ingredients Modal */}
      {showBOMModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Set Ingredients - {selectedProduct.name}
              </h2>
              <button
                onClick={() => {
                  setShowBOMModal(false);
                  setSelectedProduct(null);
                  setProductBOM([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Add Ingredient Form */}
            <form onSubmit={handleAddBOMItem} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ingredient *
                  </label>
                  <select
                    value={bomForm.inventory_item_id}
                    onChange={(e) => {
                      const selectedItem = inventoryItems.find(item => item.id === e.target.value);
                      setBomForm({ 
                        ...bomForm, 
                        inventory_item_id: e.target.value,
                        unit: selectedItem?.unit || ''
                      });
                    }}
                    className="w-full input-field"
                    required
                  >
                    <option value="">Select Ingredient</option>
                    {inventoryItems
                      .filter(item => {
                        // Exclude Finished Goods from ingredients
                        const category = (item as any).category_name || (item as any).category || '';
                        return category !== 'Finished Goods';
                      })
                      .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qty per 1 Unit *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={bomForm.quantity_required || ''}
                    onChange={(e) => setBomForm({ ...bomForm, quantity_required: e.target.value })}
                    className="w-full input-field"
                    placeholder="Enter quantity"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit (Auto from Inventory)
                  </label>
                  <input
                    type="text"
                    value={bomForm.unit || inventoryItems.find(i => i.id === bomForm.inventory_item_id)?.unit || ''}
                    className="w-full input-field bg-gray-100"
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Unit automatically matches inventory item
                  </p>
                </div>
              </div>
              <div className="mt-4">
                  <button type="submit" className="btn-primary w-full">
                    Add Ingredient
                  </button>
              </div>
            </form>

            {/* Ingredients List */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Ingredient</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">Qty per Unit</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {productBOM.length > 0 ? (
                    productBOM.map((bom) => {
                      const item = inventoryItems.find(i => i.id === bom.inventory_item_id);
                      return (
                        <tr key={bom.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">{bom.inventory_item_name || item?.name || '-'}</td>
                          <td className="p-3 text-right font-semibold">
                            {formatNumber(bom.quantity_required)} {bom.unit || item?.unit || ''}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteBOMItem(bom.id)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-gray-500">
                        No ingredients set. Add ingredients to create the recipe.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Production Modal */}
      {showProductionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Daily Production</h2>
            <form onSubmit={handleCreateProduction}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Production Date *
                  </label>
                  <input
                    type="date"
                    value={productionForm.date}
                    onChange={(e) => setProductionForm({ ...productionForm, date: e.target.value })}
                    className="w-full input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product *
                  </label>
                  <select
                    value={productionForm.productId}
                    onChange={(e) => setProductionForm({ ...productionForm, productId: e.target.value })}
                    className="w-full input-field"
                    required
                  >
                    <option value="">Select Product</option>
                    {products.filter(p => p.is_active).map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity Produced (units) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productionForm.quantityProduced || ''}
                    onChange={(e) => setProductionForm({ ...productionForm, quantityProduced: e.target.value })}
                    className="w-full input-field"
                    required
                    placeholder="Enter quantity"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Inventory will be deducted automatically based on product recipe
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={productionForm.notes}
                    onChange={(e) => setProductionForm({ ...productionForm, notes: e.target.value })}
                    className="w-full input-field"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowProductionModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Save Production
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sales Allocation Modal */}
      {showAllocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Allocate to Sales</h2>
            <form onSubmit={handleCreateAllocation}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allocation Source *
                  </label>
                  <select
                    value={allocationForm.allocationType}
                    onChange={(e) => {
                      setAllocationForm({
                        ...allocationForm,
                        allocationType: e.target.value as 'production' | 'inventory',
                        productionId: '',
                        inventoryItemId: '',
                        productId: ''
                      });
                    }}
                    className="w-full input-field"
                    required
                  >
                    <option value="production">From Production Batch</option>
                    <option value="inventory">From Inventory Stock</option>
                  </select>
                </div>
                
                {allocationForm.allocationType === 'production' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Production Batch *
                    </label>
                    <select
                      value={allocationForm.productionId}
                      onChange={(e) => {
                        const prod = productions.find(p => p.id === e.target.value);
                        setAllocationForm({
                          ...allocationForm,
                          productionId: e.target.value,
                          productId: prod?.product_id || ''
                        });
                      }}
                      className="w-full input-field"
                      required
                    >
                      <option value="">Select Production</option>
                      {productions.filter(p => {
                        const prodDate = new Date(p.date);
                        const today = new Date();
                        return prodDate.toDateString() === today.toDateString();
                      }).map((prod) => {
                        const todayProd = todayProductionWithAllocations.find(tp => tp.production_id === prod.id);
                        const remaining = todayProd ? parseFloat(todayProd.remaining_quantity || 0) : parseFloat(prod.quantity_produced || 0);
                        return (
                        <option key={prod.id} value={prod.id}>
                            {prod.product_name || prod.name} - Batch: {prod.batch || prod.date} - Produced: {formatNumber(prod.quantity_produced)} (Remaining: {formatNumber(remaining)})
                        </option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inventory Stock (Finished Goods) *
                    </label>
                    <select
                      value={allocationForm.inventoryItemId}
                      onChange={(e) => {
                        const item = inventoryItems.find(i => i.id === e.target.value);
                        if (!item) return;
                        
                        // Find matching product by name (case-insensitive, trim whitespace)
                        const itemName = (item.name || '').trim();
                        const matchingProduct = products.find(p => 
                          (p.name || '').trim().toLowerCase() === itemName.toLowerCase()
                        );
                        
                        if (!matchingProduct) {
                          alert(`Warning: No matching product found for "${itemName}". Please create the product first.`);
                        }
                        
                        setAllocationForm({
                          ...allocationForm,
                          inventoryItemId: e.target.value,
                          productId: matchingProduct?.id || ''
                        });
                      }}
                      className="w-full input-field"
                      required
                    >
                      <option value="">Select Inventory Item</option>
                      {inventoryItems
                        .filter(item => {
                          // Filter for Finished Goods category
                          const category = (item as any).category_name || (item as any).category || '';
                          const quantity = parseFloat(
                            (item as any).current_stock?.toString() || 
                            (item as any).currentStock?.toString() || 
                            (item as any).quantity?.toString() || 
                            '0'
                          );
                          return category === 'Finished Goods' && quantity > 0;
                        })
                        .map((item) => {
                          const quantity = parseFloat(
                            (item as any).current_stock?.toString() || 
                            (item as any).currentStock?.toString() || 
                            (item as any).quantity?.toString() || 
                            '0'
                          );
                          return (
                            <option key={item.id} value={item.id}>
                              {item.name} - Stock: {formatNumber(quantity)} {item.unit || 'pieces'}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity to Allocate *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={allocationForm.quantityAllocated || ''}
                    onChange={(e) => setAllocationForm({ ...allocationForm, quantityAllocated: e.target.value })}
                    className="w-full input-field"
                    required
                    placeholder="Enter quantity"
                  />
                </div>
                {salespersons.length > 1 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                      Allocate To (Salesperson) *
                  </label>
                    <select
                      value={allocationForm.salespersonId}
                      onChange={(e) => setAllocationForm({ ...allocationForm, salespersonId: e.target.value })}
                    className="w-full input-field"
                      required
                    >
                      <option value="">Select Salesperson</option>
                      {salespersons.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.name || sp.username} {sp.email ? `(${sp.email})` : ''}
                        </option>
                      ))}
                    </select>
                </div>
                ) : salespersons.length === 1 ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Allocate To
                    </label>
                    <div className="w-full input-field bg-gray-50">
                      {salespersons[0].name || salespersons[0].username}
                      {salespersons[0].email && ` (${salespersons[0].email})`}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      All items will be allocated to this salesperson
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      Loading salespersons... If this persists, please refresh the page.
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={allocationForm.notes}
                    onChange={(e) => setAllocationForm({ ...allocationForm, notes: e.target.value })}
                    className="w-full input-field"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAllocationModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Allocate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Allocation Modal */}
      {showBulkAllocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Bulk Allocation to Salespersons</h2>
            <form onSubmit={handleBulkAllocation}>
              <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                {bulkAllocations.map((allocation, index) => {
                  const production = todayProductionWithAllocations.find(p => p.production_id === allocation.productionId);
                  const remaining = production ? parseFloat(production.remaining_quantity || 0) : 0;
                  
                  return (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{allocation.productName}</h4>
                          <p className="text-xs text-gray-600">Batch: {allocation.batch}</p>
                          <p className="text-xs text-blue-600">Available: {formatNumber(remaining)} units</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {salespersons.length > 1 ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Salesperson *
                            </label>
                            <select
                              value={allocation.salespersonId}
                              onChange={(e) => {
                                const updated = [...bulkAllocations];
                                updated[index].salespersonId = e.target.value;
                                setBulkAllocations(updated);
                              }}
                              className="w-full input-field"
                              required
                            >
                              <option value="">Select Salesperson</option>
                              {salespersons.map((sp) => (
                                <option key={sp.id} value={sp.id}>
                                  {sp.name || sp.username} {sp.email ? `(${sp.email})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : salespersons.length === 1 ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Salesperson
                            </label>
                            <div className="w-full input-field bg-gray-50">
                              {salespersons[0].name || salespersons[0].username}
                              {salespersons[0].email && ` (${salespersons[0].email})`}
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                            No salesperson available
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max={remaining}
                            value={allocation.quantity}
                            onChange={(e) => {
                              const updated = [...bulkAllocations];
                              updated[index].quantity = e.target.value;
                              setBulkAllocations(updated);
                            }}
                            className="w-full input-field"
                            placeholder="Enter quantity"
                            required
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBulkAllocations(bulkAllocations.filter((_, i) => i !== index));
                        }}
                        className="mt-2 text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    const todayProds = todayProductionWithAllocations.filter(p => 
                      parseFloat(p.remaining_quantity || 0) > 0
                    );
                    setBulkAllocations([...bulkAllocations, ...todayProds.map(p => ({
                      productionId: p.production_id,
                      productId: p.product_id,
                      productName: p.product_name,
                      salespersonId: '',
                      quantity: '',
                      batch: p.batch || ''
                    }))]);
                  }}
                  className="btn-secondary"
                >
                  Add More Products
                </button>
                <div className="flex-1"></div>
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkAllocationModal(false);
                    setBulkAllocations([]);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Allocate All
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
