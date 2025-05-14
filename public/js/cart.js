let cart = [];

function addToCart(name, price, image) {
  const existingItem = cart.find(item => item.name === name);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ name, price, quantity: 1, image });
  }
  alert(`${name} added to cart!`);
}

// Optional: function to view cart
function viewCart() {
  console.log(cart);
}
