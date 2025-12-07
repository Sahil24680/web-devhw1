"use client";
import { supabase } from "./supabaseClient";
import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  X,
  Trash2,
} from "lucide-react";

interface CartItem {
  name: string;
  price: string;
  quantity: number;
}

export default function Index() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  // State to store all items added to the cart
  const [cart, setCart] = useState<CartItem[]>([]);
  // State to control whether the cart sidebar is visible
  const [isCartOpen, setIsCartOpen] = useState(false);
  // State to trigger animation when item is added
  const [cartAnimation, setCartAnimation] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);

  const galleryImages = [
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1551218808-94e220e084d2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
  ];

  const [menuItems, setMenuItems] = useState<any[]>([]);

  // Fetch menu items from Supabase
  useEffect(() => {
    const fetchMenuItems = async () => {
      const { data, error } = await supabase.from("menu_items").select("*");
      if (error) {
        console.error("Error fetching menu:", error.message);
      } else {
        setMenuItems(data);
      }
    };

    fetchMenuItems();
  }, []);

  const [pastOrders, setPastOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchPastOrders();
  }, []);

  useEffect(() => {
    const loadCartFromSupabase = async () => {
      const savedCartId = localStorage.getItem("cart_id");
      if (!savedCartId) return;

      setCartId(savedCartId); // ✅ Restore cart ID

      const { data, error } = await supabase
        .from("cart_items")
        .select("quantity, menu_items(name, price)")
        .eq("cart_id", savedCartId);

      if (error) {
        console.error("Error loading cart:", error.message);
        return;
      }

      const loadedCart = data.map((item) => ({
        //@ts-ignore
        name: item.menu_items.name,
        //@ts-ignore
        price: item.menu_items.price,
        quantity: item.quantity,
      }));

      setCart(loadedCart);
    };

    loadCartFromSupabase();
  }, []);

  /**
   * ------------------------------------------------------------
   * 🛒 ADD TO CART FUNCTION
   * ------------------------------------------------------------
   * When a user clicks "Add to Cart", this function:
   * 1. Checks if the item already exists in the cart
   * 2. If yes: increases the quantity by 1
   * 3. If no: adds it as a new item with quantity 1
   * 4. Triggers a bounce animation on the cart button
   */
  const addToCart = async (item: {
    name: string;
    price: string;
    description: string;
  }) => {
    let currentCartId = cartId;

    // Step 1: Create a new cart if none exists
    if (!currentCartId) {
      currentCartId = crypto.randomUUID();
      const { error } = await supabase.from("carts").insert([
        {
          id: currentCartId,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error("Error creating cart:", error.message);
        return;
      }

      localStorage.setItem("cart_id", currentCartId);
      setCartId(currentCartId); // Will update state, but we still use local variable here
    }

    // Step 2: Fetch the menu item's ID and price from Supabase
    const { data: menuItem, error: fetchError } = await supabase
      .from("menu_items")
      .select("id, price")
      .eq("name", item.name)
      .single();

    if (fetchError || !menuItem) {
      console.error("Error fetching menu item:", fetchError?.message);
      return;
    }

    // Step 3: Check if the item is already in the cart
    const { data: existingItem } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", currentCartId)
      .eq("menu_item_id", menuItem.id)
      .single();

    // Step 4: Update or insert into the cart_items table
    if (existingItem) {
      await supabase
        .from("cart_items")
        .update({ quantity: existingItem.quantity + 1 })
        .eq("id", existingItem.id);
    } else {
      await supabase.from("cart_items").insert([
        {
          cart_id: currentCartId,
          menu_item_id: menuItem.id,
          quantity: 1,
          added_at: new Date().toISOString(),
        },
      ]);
    }

    // Step 5: Update local UI cart state
    setCart((prevCart) => {
      const existing = prevCart.find((c) => c.name === item.name);
      if (existing) {
        return prevCart.map((c) =>
          c.name === item.name ? { ...c, quantity: c.quantity + 1 } : c
        );
      } else {
        return [
          ...prevCart,
          { name: item.name, price: item.price, quantity: 1 },
        ];
      }
    });

    // Trigger animation
    setCartAnimation(true);
    setTimeout(() => setCartAnimation(false), 600);
  };
  const fetchPastOrders = async () => {
    const storedCartId = localStorage.getItem("cart_id");
    if (!storedCartId) return;

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
      id,
      placed_at,
      total_price,
      status,
      order_items (
        quantity,
        price_each,
        menu_items (
          name
        )
      )
    `
      )
      .eq("cart_id", storedCartId)
      .order("placed_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error.message);
      return;
    }

    setPastOrders(data);
  };

  // 🗑️ remove from cart function (removes one quantity at a time)
  const removeFromCart = async (itemName: string) => {
    const updatedCart = cart
      .map((item) =>
        item.name === itemName ? { ...item, quantity: item.quantity - 1 } : item
      )
      .filter((item) => item.quantity > 0);

    setCart(updatedCart);

    // Remove from Supabase
    const { data: menuItem } = await supabase
      .from("menu_items")
      .select("id")
      .eq("name", itemName)
      .single();

    if (!menuItem || !cartId) return;

    const { data: existingItem } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("menu_item_id", menuItem.id)
      .single();

    if (existingItem) {
      if (existingItem.quantity <= 1) {
        await supabase.from("cart_items").delete().eq("id", existingItem.id);
      } else {
        await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity - 1 })
          .eq("id", existingItem.id);
      }
    }
  };

  // removes all items from the cart at once
  const clearCart = async () => {
    setCart([]);

    if (!cartId) return;

    await supabase.from("cart_items").delete().eq("cart_id", cartId);
  };

  const checkout = async () => {
    if (cart.length === 0) return;

    if (!cartId) {
      console.error("No cart to checkout.");
      return;
    }

    // Insert cart items
    for (const item of cart) {
      const { data: menuItem } = await supabase
        .from("menu_items")
        .select("id")
        .eq("name", item.name)
        .single();

      if (!menuItem) {
        console.error("Menu item not found:", item.name);
        continue;
      }

      const { error: itemError } = await supabase.from("cart_items").insert([
        {
          cart_id: cartId,
          menu_item_id: menuItem.id,
          quantity: item.quantity,
          added_at: new Date().toISOString(),
        },
      ]);

      if (itemError) {
        console.error("Error adding item:", itemError.message);
      }
    }

    // Create order
    const orderId = crypto.randomUUID();
    const totalPrice = calculateTotal();

    const { error: orderError } = await supabase.from("orders").insert([
      {
        id: orderId,
        cart_id: cartId,
        customer_name: "Guest User",
        customer_email: "guest@example.com",
        total_price: totalPrice,
        status: "pending",
        placed_at: new Date().toISOString(),
      },
    ]);

    if (orderError) {
      console.error("Order error:", orderError.message);
      return;
    }

    // Insert order items
    for (const item of cart) {
      const { data: menuItem } = await supabase
        .from("menu_items")
        .select("id, price")
        .eq("name", item.name)
        .single();

      if (!menuItem) continue;

      await supabase.from("order_items").insert([
        {
          order_id: orderId,
          menu_item_id: menuItem.id,
          quantity: item.quantity,
          price_each: menuItem.price,
        },
      ]);
    }

    alert("✅ Order placed successfully!");
    await fetchPastOrders();
    clearCart();
    setIsCartOpen(false);
  };

  // calculates the total price of items in the cart
  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      // Remove the $ sign and convert to number
      const price =
        typeof item.price === "string"
          ? parseFloat(item.price.replace("$", ""))
          : item.price;

      return total + price * item.quantity;
    }, 0);
  };

  // scroll to a section by ID and close the mobile menu
  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    setIsMenuOpen(false);
  };

  // Slider for images (forward)
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  };
  // Slider for images (backward)
  const prevImage = () => {
    setCurrentImageIndex(
      (prev) => (prev - 1 + galleryImages.length) % galleryImages.length
    );
  };

  // Contact Form Submission Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Thank you for your message! We will get back to you soon.");
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header & Navigation */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-orange-600">Feane Bistro</h1>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <button
                onClick={() => scrollToSection("home")}
                className="text-gray-800 hover:text-orange-600 transition-colors font-medium"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection("menu")}
                className="text-gray-800 hover:text-orange-600 transition-colors font-medium"
              >
                Menu
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className="text-gray-800 hover:text-orange-600 transition-colors font-medium"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection("gallery")}
                className="text-gray-800 hover:text-orange-600 transition-colors font-medium"
              >
                Gallery
              </button>
              <button
                onClick={() => scrollToSection("contact")}
                className="text-gray-800 hover:text-orange-600 transition-colors font-medium"
              >
                Contact
              </button>
            </nav>

            <div className="flex items-center space-x-4">
              {/* 🛒 CART BUTTON - Desktop with Animation */}
              <button
                onClick={() => setIsCartOpen(true)}
                className={`hidden md:flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-all relative ${
                  cartAnimation ? "animate-[bounce_0.6s_ease-in-out]" : ""
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="font-semibold">Cart</span>
                {/* Cart item count badge with animation */}
                {cart.length > 0 && (
                  <span
                    className={`absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center transition-all ${
                      cartAnimation ? "animate-[scale-in_0.3s_ease-out]" : ""
                    }`}
                  >
                    {cart.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </button>

              {/* Mobile Cart Button  */}
              <button
                onClick={() => setIsCartOpen(true)}
                className={`md:hidden flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg relative ${
                  cartAnimation ? "animate-[bounce_0.6s_ease-in-out]" : ""
                }`}
              >
                <ShoppingCart className="w-5 h-5" />

                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cart.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </button>

              {/* Mobile Hamburger */}
              <button
                className="md:hidden flex flex-col space-y-1.5 p-2"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <div
                  className={`w-6 h-0.5 bg-gray-800 transition-all duration-300 ${
                    isMenuOpen ? "rotate-45 translate-y-2" : ""
                  }`}
                ></div>
                <div
                  className={`w-6 h-0.5 bg-gray-800 transition-all duration-300 ${
                    isMenuOpen ? "opacity-0" : ""
                  }`}
                ></div>
                <div
                  className={`w-6 h-0.5 bg-gray-800 transition-all duration-300 ${
                    isMenuOpen ? "-rotate-45 -translate-y-2" : ""
                  }`}
                ></div>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <nav className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => scrollToSection("home")}
                  className="text-left text-gray-800 hover:text-orange-600 transition-colors font-medium"
                >
                  Home
                </button>
                <button
                  onClick={() => scrollToSection("menu")}
                  className="text-left text-gray-800 hover:text-orange-600 transition-colors font-medium"
                >
                  Menu
                </button>
                <button
                  onClick={() => scrollToSection("about")}
                  className="text-left text-gray-800 hover:text-orange-600 transition-colors font-medium"
                >
                  About
                </button>
                <button
                  onClick={() => scrollToSection("gallery")}
                  className="text-left text-gray-800 hover:text-orange-600 transition-colors font-medium"
                >
                  Gallery
                </button>
                <button
                  onClick={() => scrollToSection("contact")}
                  className="text-left text-gray-800 hover:text-orange-600 transition-colors font-medium"
                >
                  Contact
                </button>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* 
        ============================================================
        🛒 SHOPPING CART SIDEBAR
        ============================================================
        This is a slide-in panel that shows when isCartOpen is true
      */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50">
          {/* Dark overlay background */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsCartOpen(false)}
          ></div>

          {/* Cart panel sliding from the right */}
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
            {/* Cart Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <ShoppingCart className="w-6 h-6 text-orange-500" />
                <span>Your Cart</span>
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                // Empty cart message
                <div className="text-center text-gray-500 mt-12">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Your cart is empty</p>
                  <p className="text-sm mt-2">
                    Add some delicious items from our menu!
                  </p>
                </div>
              ) : (
                // Display cart items
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-4 flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {item.name}
                        </h3>
                        <p className="text-orange-500 font-bold mt-1">
                          {item.price}
                        </p>
                        <div className="flex items-center space-x-3 mt-2">
                          {/* Decrease Quantity */}
                          <button
                            onClick={() => removeFromCart(item.name)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-md text-gray-700 hover:bg-gray-300"
                          >
                            -
                          </button>

                          {/* Quantity Number */}
                          <span className="font-semibold text-gray-800">
                            {item.quantity}
                          </span>

                          {/* Increase Quantity */}
                          <button
                            onClick={() =>
                              addToCart({
                                name: item.name,
                                price: item.price,
                                description: "",
                              })
                            }
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-md text-gray-700 hover:bg-gray-300"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {/* Remove button */}
                      <button
                        onClick={() => removeFromCart(item.name)}
                        className="text-red-500 hover:text-red-700 transition-colors p-2"
                        title="Remove from cart"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer with Total and Actions */}
            {cart.length > 0 && (
              <div className="border-t border-gray-200 p-6 space-y-4">
                {/* Total Price Display */}
                <div className="flex justify-between items-center text-xl font-bold">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-orange-500">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={checkout}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Proceed to Checkout
                  </button>

                  {/* Clear Cart Button */}
                  <button
                    onClick={clearCart}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Clear Cart</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section
        id="home"
        className="relative min-h-screen flex items-center justify-center"
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1600891964092-4316c288032e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80)",
          }}
        >
          <div className="absolute inset-0 bg-black/60"></div>
        </div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">Feane Bistro</h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
            Exceptional dining in the heart of New York
          </p>
          <button
            onClick={() => scrollToSection("menu")}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 text-lg rounded-lg transition-colors shadow-lg"
          >
            Explore Our Menu
          </button>
        </div>
      </section>

      {/* Menu Section */}
      <section id="menu" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Menu</h2>
            <p className="text-gray-800 text-lg max-w-2xl mx-auto">
              Carefully crafted dishes with the finest ingredients
            </p>
          </div>

          {/*  menu items with "add to cart" buttons*/}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {menuItems.map((item, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {item.name}
                  </h3>
                  <span className="text-xl font-bold text-orange-500">
                    {item.price}
                  </span>
                </div>
                <p className="text-gray-800 leading-relaxed mb-4">
                  {item.description}
                </p>

                {/* add to cart button */}
                <button
                  onClick={() => addToCart(item)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ✅ Past Orders Section */}
      <section id="past-orders" className="py-20 bg-gray-50 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Your Past Orders
          </h2>

          {pastOrders.length === 0 ? (
            <p className="text-gray-600">You haven't placed any orders yet.</p>
          ) : (
            <ul className="space-y-4">
              {pastOrders.map((order) => (
                <li
                  key={order.id}
                  className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-800">
                      Order #{order.id.slice(0, 8)}...
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(order.placed_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-2 text-gray-700 space-y-1">
                    <p>
                      <strong>Status:</strong>{" "}
                      <span className="font-medium capitalize text-orange-600">
                        {order.status}
                      </span>
                    </p>
                    <p>
                      <strong>Total:</strong>{" "}
                      <span className="font-semibold text-gray-800">
                        ${order.total_price}
                      </span>
                    </p>
                  </div>

                  {/* 🧾 Ordered Items */}
                  <div className="mt-4">
                    <p className="font-semibold text-gray-800 mb-2">Items:</p>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                      {order.order_items.map((item: any, i:any) => (
                        <li key={i}>
                          {item.menu_items?.name} × {item.quantity} – $
                          {(item.price_each * item.quantity).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-20 bg-gray-50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Gallery</h2>
            <p className="text-gray-800 text-lg max-w-2xl mx-auto">
              A glimpse into our culinary world
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-xl shadow-lg">
              <img
                src={galleryImages[currentImageIndex]}
                alt="Restaurant gallery"
                className="w-full h-96 object-cover"
              />

              {/* Navigation Buttons */}
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Dot Indicators */}
            <div className="flex justify-center mt-6 space-x-2">
              {galleryImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentImageIndex
                      ? "bg-orange-500"
                      : "bg-gray-300"
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            About Feane Bistro
          </h2>
          <p className="text-lg text-gray-800 leading-relaxed">
            Established in 2010, Feane Bistro has been serving exceptional
            French-inspired cuisine in the heart of New York City. Our
            passionate chefs use only the finest seasonal ingredients to create
            memorable dining experiences. From our signature duck confit to our
            decadent chocolate soufflé, every dish tells a story of culinary
            excellence and tradition. We believe that great food brings people
            together, and our warm, inviting atmosphere makes every meal
            special.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Contact Us
            </h2>
            <p className="text-gray-800 text-lg max-w-2xl mx-auto">
              We'd love to hear from you
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Your Email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Your Message"
                    rows={5}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Send Message
                </button>
              </form>
            </div>

            {/* Map */}
            <div className="h-96 rounded-xl overflow-hidden shadow-sm">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.9663095343008!2d-74.00425878459418!3d40.74844097932681!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259bf5c1654f3%3A0xc80f9cfce5383d5d!2s123%20Main%20St%2C%20New%20York%2C%20NY%2010001!5e0!3m2!1sen!2sus!4v1635959655935!5m2!1sen!2sus"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Feane Bistro Location"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Business Info */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-orange-400">
                Feane Bistro
              </h3>
              <div className="space-y-2 text-gray-300">
                <p>123 Main Street</p>
                <p>New York, NY 10001</p>
                <p>(212) 555-0199</p>
                <p>hello@feanebistro.com</p>
              </div>
            </div>

            {/* Business Hours */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-orange-400">Hours</h3>
              <div className="space-y-2 text-gray-300">
                <p>Monday - Thursday: 5:00 PM - 10:00 PM</p>
                <p>Friday - Saturday: 5:00 PM - 11:00 PM</p>
                <p>Sunday: 4:00 PM - 9:00 PM</p>
              </div>
            </div>

            {/* Social Links */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-orange-400">
                Follow Us
              </h3>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="text-gray-300 hover:text-orange-400 transition-colors"
                >
                  Facebook
                </a>
                <a
                  href="#"
                  className="text-gray-300 hover:text-orange-400 transition-colors"
                >
                  Instagram
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Feane Bistro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
