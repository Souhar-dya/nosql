const apiRoot = '/api/items';

// State
let items = [];
let selectedIds = new Set();
let currentFilters = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadItems();
  setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
  document.getElementById('createForm').addEventListener('submit', handleCreateItem);
  document.getElementById('importSample').addEventListener('click', importSample);
  document.getElementById('refreshBtn').addEventListener('click', () => loadItems());
  document.getElementById('applyFilters').addEventListener('click', applyFilters);
  document.getElementById('clearFilters').addEventListener('click', clearFilters);
  document.getElementById('bulkIncrement').addEventListener('click', handleBulkIncrement);
  document.getElementById('bulkDelete').addEventListener('click', handleBulkDelete);
  document.getElementById('itemsGrid').addEventListener('click', handleItemClick);
  document.getElementById('itemsGrid').addEventListener('change', handleCheckboxChange);
}

// Create Item
async function handleCreateItem(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {
    name: formData.get('name'),
    category: formData.get('category') || undefined,
    qty: Number(formData.get('qty')) || 0,
    price: Number(formData.get('price')) || 0,
    description: formData.get('description') || undefined,
    tags: formData.get('tags') ? formData.get('tags').split(',').map(s => s.trim()).filter(Boolean) : []
  };

  try {
    const res = await fetch(apiRoot, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!res.ok) throw new Error('Failed to create item');
    
    showToast('✅ Item created successfully!', 'success');
    e.target.reset();
    loadItems();
  } catch (err) {
    showToast('❌ Error creating item: ' + err.message, 'error');
  }
}

// Load Items
async function loadItems() {
  const container = document.getElementById('itemsGrid');
  container.innerHTML = '<div class="loading">Loading items...</div>';
  
  try {
    const params = new URLSearchParams(currentFilters);
    const res = await fetch(apiRoot + '?' + params);
    const json = await res.json();
    
    items = json.docs || [];
    renderItems(items);
    await updateStats();
    await updateCategoryFilter();
    updatePaginationInfo(json);
  } catch (err) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-text">Error loading items: ${err.message}</div>
    </div>`;
  }
}

// Render Items
function renderItems(items) {
  const container = document.getElementById('itemsGrid');
  
  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📦</div>
      <div class="empty-state-text">No items found. Create one or import sample data!</div>
    </div>`;
    return;
  }
  
  container.innerHTML = items.map(item => `
    <div class="item-card ${selectedIds.has(item._id) ? 'selected' : ''}" data-id="${item._id}">
      <input type="checkbox" class="item-checkbox" data-id="${item._id}" ${selectedIds.has(item._id) ? 'checked' : ''}>
      
      <div class="item-header">
        <div>
          <div class="item-name">${escapeHtml(item.name)}</div>
          ${item.category ? `<span class="item-category">${escapeHtml(item.category)}</span>` : ''}
        </div>
      </div>
      
      ${item.description ? `<div class="item-description">${escapeHtml(item.description)}</div>` : ''}
      
      ${item.tags && item.tags.length > 0 ? `
        <div class="item-tags">
          ${item.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      ` : ''}
      
      <div class="item-stats">
        <div class="item-stat">
          <div class="item-stat-label">Quantity</div>
          <div class="item-stat-value">${item.qty || 0}</div>
        </div>
        <div class="item-stat">
          <div class="item-stat-label">Price</div>
          <div class="item-stat-value">$${(item.price || 0).toFixed(2)}</div>
        </div>
      </div>
      
      <div class="item-actions">
        <button class="btn btn-secondary btn-inc" data-id="${item._id}">+1</button>
        <button class="btn btn-outline btn-edit" data-id="${item._id}">✏️ Edit</button>
        <button class="btn btn-danger btn-del" data-id="${item._id}">🗑️</button>
      </div>
    </div>
  `).join('');
}

// Update Stats
async function updateStats() {
  try {
    const countRes = await fetch(apiRoot + '/meta/count');
    const countData = await countRes.json();
    
    const aggRes = await fetch(apiRoot + '/aggregate/category-count');
    const aggData = await aggRes.json();
    
    const totalItems = countData.count || 0;
    const totalCategories = aggData.length || 0;
    const totalValue = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const avgPrice = items.length > 0 ? items.reduce((sum, item) => sum + item.price, 0) / items.length : 0;
    
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('totalCategories').textContent = totalCategories;
    document.getElementById('totalValue').textContent = '$' + totalValue.toFixed(2);
    document.getElementById('avgPrice').textContent = '$' + avgPrice.toFixed(2);
  } catch (err) {
    console.error('Error updating stats:', err);
  }
}

// Update Category Filter
async function updateCategoryFilter() {
  try {
    const res = await fetch(apiRoot + '/aggregate/category-count');
    const data = await res.json();
    
    const select = document.getElementById('filterCategory');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">All Categories</option>' + 
      data.map(cat => `<option value="${escapeHtml(cat._id || 'Uncategorized')}">${escapeHtml(cat._id || 'Uncategorized')} (${cat.count})</option>`).join('');
    
    select.value = currentValue;
  } catch (err) {
    console.error('Error updating categories:', err);
  }
}

// Apply Filters
function applyFilters() {
  const filters = {};
  
  const searchText = document.getElementById('searchText').value.trim();
  if (searchText) filters.q = searchText;
  
  const category = document.getElementById('filterCategory').value;
  if (category) filters.category = category;
  
  const sortBy = document.getElementById('sortBy').value;
  if (sortBy) filters.sort = sortBy;
  
  currentFilters = filters;
  loadItems();
}

// Clear Filters
function clearFilters() {
  document.getElementById('searchText').value = '';
  document.getElementById('filterCategory').value = '';
  document.getElementById('sortBy').value = '';
  currentFilters = {};
  loadItems();
}

// Handle Item Click
async function handleItemClick(e) {
  const id = e.target.dataset.id;
  if (!id) return;
  
  if (e.target.classList.contains('btn-del')) {
    if (!confirm('Delete this item?')) return;
    try {
      await fetch(apiRoot + '/' + id, { method: 'DELETE' });
      showToast('✅ Item deleted', 'success');
      loadItems();
    } catch (err) {
      showToast('❌ Error deleting item', 'error');
    }
  }
  
  if (e.target.classList.contains('btn-inc')) {
    try {
      await fetch(apiRoot + '/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], delta: 1 })
      });
      showToast('✅ Quantity increased', 'success');
      loadItems();
    } catch (err) {
      showToast('❌ Error updating item', 'error');
    }
  }
  
  if (e.target.classList.contains('btn-edit')) {
    const item = items.find(i => i._id === id);
    if (item) {
      document.getElementById('name').value = item.name;
      document.getElementById('category').value = item.category || '';
      document.getElementById('qty').value = item.qty || 0;
      document.getElementById('price').value = item.price || 0;
      document.getElementById('description').value = item.description || '';
      document.getElementById('tags').value = (item.tags || []).join(', ');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('📝 Item loaded for editing', 'success');
    }
  }
}

// Handle Checkbox Change
function handleCheckboxChange(e) {
  if (e.target.classList.contains('item-checkbox')) {
    const id = e.target.dataset.id;
    if (e.target.checked) {
      selectedIds.add(id);
    } else {
      selectedIds.delete(id);
    }
    updateBulkActions();
    renderItems(items);
  }
}

// Update Bulk Actions
function updateBulkActions() {
  const count = selectedIds.size;
  document.getElementById('bulkInfo').textContent = `${count} item${count !== 1 ? 's' : ''} selected`;
  document.getElementById('bulkIncrement').disabled = count === 0;
  document.getElementById('bulkDelete').disabled = count === 0;
}

// Handle Bulk Increment
async function handleBulkIncrement() {
  if (selectedIds.size === 0) return;
  
  try {
    await fetch(apiRoot + '/bulk-update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds), delta: 1 })
    });
    showToast(`✅ Updated ${selectedIds.size} items`, 'success');
    selectedIds.clear();
    updateBulkActions();
    loadItems();
  } catch (err) {
    showToast('❌ Error updating items', 'error');
  }
}

// Handle Bulk Delete
async function handleBulkDelete() {
  if (selectedIds.size === 0) return;
  
  if (!confirm(`Delete ${selectedIds.size} selected items?`)) return;
  
  try {
    await fetch(apiRoot, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds) })
    });
    showToast(`✅ Deleted ${selectedIds.size} items`, 'success');
    selectedIds.clear();
    updateBulkActions();
    loadItems();
  } catch (err) {
    showToast('❌ Error deleting items', 'error');
  }
}

// Import Sample
async function importSample() {
  try {
    await fetch(apiRoot + '/import-sample', { method: 'POST' });
    showToast('✅ Sample data imported!', 'success');
    loadItems();
  } catch (err) {
    showToast('❌ Error importing sample data', 'error');
  }
}

// Update Pagination Info
function updatePaginationInfo(json) {
  const info = document.getElementById('paginationInfo');
  if (json.docs && json.docs.length > 0) {
    info.textContent = `Showing ${json.docs.length} of ${json.total || json.docs.length} items`;
  } else {
    info.textContent = '';
  }
}

// Show Toast
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
