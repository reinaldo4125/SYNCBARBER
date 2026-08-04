import React, { useState } from "react";
import { 
  InventoryItem, 
  ProductSale, 
  Barber, 
  ClientAccount 
} from "../types";
import { 
  Package, 
  ShoppingBag, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Search, 
  Check, 
  X, 
  Wine, 
  Sparkles, 
  BarChart3, 
  Receipt,
  User,
  ShieldCheck
} from "lucide-react";

interface InventoryManagerProps {
  inventory: InventoryItem[];
  sales: ProductSale[];
  barbers: Barber[];
  clients: ClientAccount[];
  formatPrice: (price: number) => string;
  activeLicense: "basica" | "profesional" | "premium";
  onRefresh?: () => void;
  triggerToast?: (title: string, message: string, type?: "success" | "info" | "warning") => void;
}

export default function InventoryManager({
  inventory,
  sales,
  barbers,
  clients,
  formatPrice,
  activeLicense,
  onRefresh,
  triggerToast
}: InventoryManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<"pos" | "catalog" | "sales">("pos");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Quick Cart State for POS
  const [cart, setCart] = useState<{ item: InventoryItem; quantity: number }[]>([]);
  const [selectedClientName, setSelectedClientName] = useState("");
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "nequi_daviplata" | "tarjeta">("efectivo");
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Modal Product State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "nevera" as InventoryItem["category"],
    price: 0,
    cost: 0,
    stock: 10,
    minStock: 3,
    barcode: "",
    allowBarberCommission: false,
    commissionPercent: 10
  });
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Quick Stock Adjustment state
  const [adjustingStockId, setAdjustingStockId] = useState<string | null>(null);

  // Filtered inventory
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.barcode && item.barcode.includes(searchTerm));
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Low stock items
  const lowStockItems = inventory.filter(i => i.stock <= i.minStock);

  // Totals calculations
  const totalStockCount = inventory.reduce((sum, i) => sum + i.stock, 0);
  const totalCostValue = inventory.reduce((sum, i) => sum + (i.cost * i.stock), 0);
  const totalSaleValue = inventory.reduce((sum, i) => sum + (i.price * i.stock), 0);
  const estimatedProfit = totalSaleValue - totalCostValue;

  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

  // Add item to cart
  const handleAddToCart = (item: InventoryItem) => {
    if (item.stock <= 0) {
      if (triggerToast) triggerToast("Sin Stock", `El producto ${item.name} no tiene existencias disponibles.`, "warning");
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((c) => c.item.id === item.id);
      if (existingIndex >= 0) {
        const currentQty = prevCart[existingIndex].quantity;
        if (currentQty >= item.stock) {
          if (triggerToast) triggerToast("Límite de Stock", `Solo hay ${item.stock} unidades de ${item.name} en inventario.`, "warning");
          return prevCart;
        }
        const updated = [...prevCart];
        updated[existingIndex] = { ...updated[existingIndex], quantity: currentQty + 1 };
        return updated;
      }
      return [...prevCart, { item, quantity: 1 }];
    });
  };

  // Remove from cart
  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  // Update cart quantity
  const handleUpdateCartQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev.map((c) => {
        if (c.item.id === itemId) {
          const newQty = c.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > c.item.stock) {
            if (triggerToast) triggerToast("Stock Límite", `No hay más existencias disponibles (${c.item.stock}).`, "warning");
            return c;
          }
          return { ...c, quantity: newQty };
        }
        return c;
      }).filter(Boolean) as { item: InventoryItem; quantity: number }[];
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);

  // Process POS Sale
  const handleCheckoutSale = async () => {
    if (cart.length === 0) return;
    setIsProcessingSale(true);

    try {
      const selectedBarb = barbers.find(b => b.id === selectedBarberId);
      const payload = {
        items: cart.map(c => ({
          productId: c.item.id,
          quantity: c.quantity
        })),
        clientName: selectedClientName.trim() || "Cliente Mostrador",
        barberId: selectedBarberId || undefined,
        barberName: selectedBarb ? selectedBarb.name : "Mostrador / Salón",
        paymentMethod
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setCart([]);
        setSelectedClientName("");
        setSelectedBarberId("");
        if (onRefresh) onRefresh();
        if (triggerToast) triggerToast("Venta Exitosa 🥤", "Venta registrada y stock descontado correctamente.", "success");
      } else {
        const err = await res.json();
        if (triggerToast) triggerToast("Error en Venta", err.error || "No se pudo procesar la venta.", "warning");
      }
    } catch (e: any) {
      if (triggerToast) triggerToast("Error", "Error de red al procesar la venta.", "warning");
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Open Edit/New Product Modal
  const handleOpenProductModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        price: item.price,
        cost: item.cost,
        stock: item.stock,
        minStock: item.minStock,
        barcode: item.barcode || "",
        allowBarberCommission: !!item.allowBarberCommission,
        commissionPercent: item.commissionPercent || 10
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        category: "nevera",
        price: 0,
        cost: 0,
        stock: 10,
        minStock: 3,
        barcode: "",
        allowBarberCommission: false,
        commissionPercent: 10
      });
    }
    setShowProductModal(true);
  };

  // Save Product Submit
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSavingProduct(true);
    try {
      const url = editingItem ? `/api/inventory/${editingItem.id}` : "/api/inventory";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowProductModal(false);
        if (onRefresh) onRefresh();
        if (triggerToast) triggerToast("Inventario Actualizado", editingItem ? "Producto modificado con éxito." : "Nuevo producto/bebida creada.", "success");
      } else {
        const err = await res.json();
        if (triggerToast) triggerToast("Error", err.error || "No se pudo guardar el item.", "warning");
      }
    } catch (err) {
      if (triggerToast) triggerToast("Error", "Error al comunicarse con el servidor.", "warning");
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Adjust stock inline
  const handleAdjustStock = async (id: string, delta: number) => {
    setAdjustingStockId(id);
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const newStock = Math.max(0, item.stock + delta);
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock })
      });
      if (res.ok && onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setAdjustingStockId(null);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este producto/bebida del inventario?")) return;

    try {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (onRefresh) onRefresh();
        if (triggerToast) triggerToast("Eliminado", "Producto eliminado del catálogo.", "info");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6" id="inventory-manager-container">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-elegant-card border border-elegant-border rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-950/60 text-cyan-400 border border-cyan-800/50 rounded-2xl">
            <Wine className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-wider uppercase font-mono">
                Módulo de Inventario, Nevera & POS
              </h2>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                activeLicense === "premium" 
                  ? "bg-amber-950/60 text-[#C5A267] border-amber-800/60" 
                  : "bg-cyan-950/60 text-cyan-400 border-cyan-800/60"
              }`}>
                {activeLicense === "premium" ? "Enterprise VIP" : "Plan Profesional"}
              </span>
            </div>
            <p className="text-xs text-elegant-text-muted mt-0.5">
              Gestión de bebidas frías, ceras, cosmética capilar, ventas directas y consumos de clientes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenProductModal()}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-950/30"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Bebida / Producto</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-elegant-card border border-elegant-border rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Existencias Totales</span>
            <Package className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white font-mono">{totalStockCount}</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">{inventory.length} referencias activas</span>
          </div>
        </div>

        <div className="bg-elegant-card border border-elegant-border rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Valor Inventario (Venta)</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">{formatPrice(totalSaleValue)}</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">Ganancia est: {formatPrice(estimatedProfit)}</span>
          </div>
        </div>

        <div className="bg-elegant-card border border-elegant-border rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Ventas Registradas</span>
            <Receipt className="h-4 w-4 text-[#C5A267]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#C5A267] font-mono">{formatPrice(totalSalesRevenue)}</span>
            <span className="text-[10px] text-gray-400 block mt-0.5">{sales.length} transacciones registradas</span>
          </div>
        </div>

        <div className={`border rounded-2xl p-4 flex flex-col justify-between ${
          lowStockItems.length > 0 
            ? "bg-rose-950/20 border-rose-800/50 text-rose-300" 
            : "bg-elegant-card border-elegant-border text-gray-400"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Alertas Stock Bajo</span>
            <AlertTriangle className={`h-4 w-4 ${lowStockItems.length > 0 ? "text-rose-400 animate-pulse" : "text-gray-500"}`} />
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-black font-mono ${lowStockItems.length > 0 ? "text-rose-400" : "text-white"}`}>
              {lowStockItems.length}
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              {lowStockItems.length > 0 ? "Requieren reabastecimiento urgente" : "Stock saludable"}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-elegant-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("pos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "pos"
              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/40"
              : "bg-elegant-sub text-gray-400 hover:text-white"
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Venta Rápida POS & Nevera</span>
        </button>

        <button
          onClick={() => setActiveSubTab("catalog")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "catalog"
              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/40"
              : "bg-elegant-sub text-gray-400 hover:text-white"
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Catálogo & Control de Stock</span>
        </button>

        <button
          onClick={() => setActiveSubTab("sales")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "sales"
              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950/40"
              : "bg-elegant-sub text-gray-400 hover:text-white"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Historial de Ventas</span>
        </button>
      </div>

      {/* TAB 1: POS & NEVERA QUICK SALES */}
      {activeSubTab === "pos" && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Products Grid */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar cerveza, producto o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-elegant-sub border border-elegant-border rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Todas las Categorías</option>
                <option value="nevera">🧊 Nevera / Bebidas</option>
                <option value="estilizado">💈 Estilizado & Ceras</option>
                <option value="barba">🧔 Cuidado de Barba</option>
                <option value="cabello">✂️ Capilar / Shampoo</option>
                <option value="accesorios">⚡ Accesorios</option>
              </select>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredInventory.map((item) => {
                const isNevera = item.category === "nevera";
                const isOutOfStock = item.stock <= 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => !isOutOfStock && handleAddToCart(item)}
                    className={`bg-elegant-card border rounded-2xl p-3 flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                      isOutOfStock
                        ? "border-rose-900/40 opacity-50 cursor-not-allowed"
                        : "border-elegant-border hover:border-cyan-500/60 hover:shadow-lg hover:shadow-cyan-950/30"
                    }`}
                  >
                    {isNevera && (
                      <div className="absolute top-2 right-2 text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 p-1 rounded-lg text-[10px]">
                        🧊
                      </div>
                    )}

                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider font-mono">
                        {item.category}
                      </span>
                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                        {item.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-elegant-border/50 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-cyan-400 font-mono">
                          {formatPrice(item.price)}
                        </span>
                        <span className={`block text-[9px] font-mono ${
                          item.stock <= item.minStock ? "text-rose-400 font-bold" : "text-gray-400"
                        }`}>
                          Stock: {item.stock}
                        </span>
                      </div>

                      <button
                        disabled={isOutOfStock}
                        className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          isOutOfStock
                            ? "bg-rose-950/40 text-rose-500"
                            : "bg-cyan-600/20 text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white"
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* POS Cart / Ticket Bar */}
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xl">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-elegant-border pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-cyan-400" />
                  <h3 className="font-extrabold text-white text-sm uppercase tracking-wider font-mono">Ticket de Venta</h3>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[10px] text-rose-400 hover:underline font-bold"
                  >
                    Vaciar
                  </button>
                )}
              </div>

              {/* Cart List */}
              {cart.length === 0 ? (
                <div className="py-12 text-center text-gray-500 space-y-2">
                  <ShoppingBag className="h-10 w-10 mx-auto opacity-30 text-cyan-400" />
                  <p className="text-xs font-bold">Selecciona bebidas o productos</p>
                  <p className="text-[10px] text-gray-600">Haz clic en los elementos de la izquierda para agregarlos a la nota de venta.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {cart.map(({ item, quantity }) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-elegant-sub p-2.5 rounded-xl border border-elegant-border/60 text-xs"
                    >
                      <div className="flex-1 pr-2">
                        <p className="font-bold text-white text-[11px] truncate">{item.name}</p>
                        <p className="text-[10px] text-cyan-400 font-mono">{formatPrice(item.price)} c/u</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-elegant-card border border-elegant-border rounded-lg px-1">
                          <button
                            onClick={() => handleUpdateCartQty(item.id, -1)}
                            className="px-1.5 py-0.5 text-gray-400 hover:text-white font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="px-2 font-mono font-bold text-white text-xs">{quantity}</span>
                          <button
                            onClick={() => handleUpdateCartQty(item.id, 1)}
                            className="px-1.5 py-0.5 text-gray-400 hover:text-white font-bold text-xs"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-mono font-black text-white text-xs w-16 text-right">
                          {formatPrice(item.price * quantity)}
                        </span>

                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="text-gray-500 hover:text-rose-400 p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer & Barber Assignment */}
            {cart.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-elegant-border">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Cliente (Opcional):</label>
                  <input
                    type="text"
                    placeholder="Nombre del cliente..."
                    value={selectedClientName}
                    onChange={(e) => setSelectedClientName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-elegant-sub border border-elegant-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Barbero que realiza la venta:</label>
                  <select
                    value={selectedBarberId}
                    onChange={(e) => setSelectedBarberId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-elegant-sub border border-elegant-border text-white rounded-xl focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Venta General en Mostrador --</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Método de Pago:</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("efectivo")}
                      className={`p-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                        paymentMethod === "efectivo"
                          ? "bg-cyan-950/80 border-cyan-500 text-cyan-300"
                          : "bg-elegant-sub border-elegant-border text-gray-400"
                      }`}
                    >
                      Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("nequi_daviplata")}
                      className={`p-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                        paymentMethod === "nequi_daviplata"
                          ? "bg-cyan-950/80 border-cyan-500 text-cyan-300"
                          : "bg-elegant-sub border-elegant-border text-gray-400"
                      }`}
                    >
                      Nequi / Davi
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("tarjeta")}
                      className={`p-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                        paymentMethod === "tarjeta"
                          ? "bg-cyan-950/80 border-cyan-500 text-cyan-300"
                          : "bg-elegant-sub border-elegant-border text-gray-400"
                      }`}
                    >
                      Tarjeta
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between py-2 border-t border-b border-elegant-border/80">
                  <span className="font-extrabold text-white text-xs uppercase font-mono">Total a Cobrar:</span>
                  <span className="text-xl font-black text-cyan-400 font-mono">{formatPrice(cartTotal)}</span>
                </div>

                <button
                  onClick={handleCheckoutSale}
                  disabled={isProcessingSale}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  <span>{isProcessingSale ? "Procesando..." : "Confirmar y Cobrar Venta"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CATALOG & STOCK MANAGEMENT */}
      {activeSubTab === "catalog" && (
        <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-extrabold text-white text-base font-mono uppercase tracking-wider">Control de Inventario & Precios</h3>
              <p className="text-xs text-gray-400">Ajusta existencias, precios de costo y alerta de stock mínimo.</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Filtrar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs p-2 bg-elegant-sub border border-elegant-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-elegant-sub text-gray-400 uppercase font-mono text-[10px] tracking-wider border-b border-elegant-border">
                <tr>
                  <th className="p-3">Producto / Bebida</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3 text-right">Precio Costo</th>
                  <th className="p-3 text-right">Precio Venta</th>
                  <th className="p-3 text-center">Stock Actual</th>
                  <th className="p-3 text-center">Stock Mínimo</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-elegant-border/60 text-gray-300">
                {filteredInventory.map((item) => {
                  const isLow = item.stock <= item.minStock;
                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-white">{item.name}</div>
                        {item.barcode && (
                          <div className="text-[10px] text-gray-500 font-mono">SKU: {item.barcode}</div>
                        )}
                      </td>
                      <td className="p-3 uppercase font-mono text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-elegant-sub border border-elegant-border">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-gray-400">
                        {formatPrice(item.cost)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-cyan-400">
                        {formatPrice(item.price)}
                      </td>
                      <td className="p-3 text-center font-mono">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleAdjustStock(item.id, -1)}
                            disabled={adjustingStockId === item.id || item.stock <= 0}
                            className="w-6 h-6 bg-elegant-sub border border-elegant-border hover:bg-rose-950 hover:text-rose-400 text-gray-300 rounded-md font-bold transition-all cursor-pointer"
                          >
                            -
                          </button>
                          <span className={`px-2 py-0.5 rounded font-black ${
                            isLow ? "bg-rose-950 text-rose-400 border border-rose-800/60" : "text-white"
                          }`}>
                            {item.stock}
                          </span>
                          <button
                            onClick={() => handleAdjustStock(item.id, 1)}
                            disabled={adjustingStockId === item.id}
                            className="w-6 h-6 bg-elegant-sub border border-elegant-border hover:bg-emerald-950 hover:text-emerald-400 text-gray-300 rounded-md font-bold transition-all cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono text-gray-400">
                        {item.minStock}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenProductModal(item)}
                            className="p-1.5 bg-elegant-sub border border-elegant-border text-gray-300 hover:text-cyan-400 rounded-lg transition-all"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(item.id)}
                            className="p-1.5 bg-elegant-sub border border-elegant-border text-gray-300 hover:text-rose-400 rounded-lg transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SALES HISTORY */}
      {activeSubTab === "sales" && (
        <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 space-y-4 shadow-xl">
          <div>
            <h3 className="font-extrabold text-white text-base font-mono uppercase tracking-wider">Historial de Ventas POS & Consumos</h3>
            <p className="text-xs text-gray-400">Registro histórico de salidas de bebidas y productos en salón.</p>
          </div>

          {sales.length === 0 ? (
            <div className="py-12 text-center text-gray-500 space-y-2">
              <Receipt className="h-10 w-10 mx-auto opacity-30 text-cyan-400" />
              <p className="text-xs font-bold">No hay ventas registradas aún</p>
              <p className="text-[10px] text-gray-600">Las ventas procesadas en el mostrador aparecerán listadas aquí.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="bg-elegant-sub border border-elegant-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">Sale #{sale.id.slice(-6)}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(sale.createdAt).toLocaleString("es-CO")}
                      </span>
                      <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800/40 rounded text-[9px] font-bold uppercase">
                        {sale.paymentMethod}
                      </span>
                    </div>

                    <div className="text-gray-300 text-[11px] flex flex-wrap gap-x-4">
                      <span><strong>Cliente:</strong> {sale.clientName}</span>
                      <span><strong>Atendido por:</strong> {sale.barberName}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {sale.items.map((it, idx) => (
                        <span key={idx} className="bg-elegant-card px-2 py-0.5 border border-elegant-border rounded text-[10px] text-gray-300 font-mono">
                          {it.quantity}x {it.name} ({formatPrice(it.subtotal)})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-gray-400 block uppercase font-mono">Total Cobrado</span>
                    <span className="text-lg font-black text-cyan-400 font-mono">{formatPrice(sale.totalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT PRODUCT */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-elegant-card border border-elegant-border rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative my-8 text-left">
            <div className="flex items-center justify-between border-b border-elegant-border pb-3">
              <h3 className="font-extrabold text-white text-base font-mono uppercase tracking-wider">
                {editingItem ? "Editar Producto / Bebida" : "Nuevo Producto o Bebida de Nevera"}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-300 uppercase text-[10px]">Nombre del Item *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cerveza Club Colombia 330ml / Cera Mate 100g"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-elegant-sub border border-elegant-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-300 uppercase text-[10px]">Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full p-3 bg-elegant-sub border border-elegant-border text-white rounded-xl focus:outline-none focus:border-cyan-500"
                  >
                    <option value="nevera">🧊 Nevera / Bebidas</option>
                    <option value="estilizado">💈 Estilizado & Ceras</option>
                    <option value="barba">🧔 Cuidado de Barba</option>
                    <option value="cabello">✂️ Capilar / Shampoo</option>
                    <option value="accesorios">⚡ Accesorios</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-300 uppercase text-[10px]">Código de Barras / SKU</label>
                  <input
                    type="text"
                    placeholder="7702..."
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full p-3 bg-elegant-sub border border-elegant-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-300 uppercase text-[10px]">Precio de Costo (COP)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="3500"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    className="w-full p-3 bg-elegant-sub border border-elegant-border rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-300 uppercase text-[10px]">Precio de Venta (COP) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="7000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full p-3 bg-elegant-sub border border-elegant-border rounded-xl text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-300 uppercase text-[10px]">Stock Inicial / Actual</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full p-3 bg-elegant-sub border border-elegant-border rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-300 uppercase text-[10px]">Stock Mínimo (Alerta)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                    className="w-full p-3 bg-elegant-sub border border-elegant-border rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-elegant-sub border border-elegant-border rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowBarberCommission}
                    onChange={(e) => setFormData({ ...formData, allowBarberCommission: e.target.checked })}
                    className="rounded border-gray-700 text-cyan-500 focus:ring-0"
                  />
                  <span className="font-bold text-white text-xs">Pagar Comisión al Barbero por Vender Este Producto</span>
                </label>

                {formData.allowBarberCommission && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-gray-400 uppercase">Porcentaje Comisión:</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.commissionPercent}
                      onChange={(e) => setFormData({ ...formData, commissionPercent: Number(e.target.value) })}
                      className="w-20 p-1.5 bg-elegant-card border border-elegant-border rounded text-white font-mono text-center text-xs"
                    />
                    <span className="text-cyan-400 font-bold">%</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-lg shadow-cyan-950/40 text-center"
                >
                  {isSavingProduct ? "Guardando..." : "Guardar Producto en Inventario"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-3 bg-elegant-sub border border-elegant-border text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
