const apiRoot = '/api/items';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadItems();
  setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
  // Main UI controls
  document.getElementById('toggleOperations').addEventListener('click', toggleOperationsPanel);
  document.getElementById('refreshBtn').addEventListener('click', () => loadItems());
  document.getElementById('importSample').addEventListener('click', importSample);

  // All 14 operations
  document.getElementById('createForm').addEventListener('submit', handleCreateItem);
  document.getElementById('bulkInsertForm').addEventListener('submit', handleBulkInsert);
  document.getElementById('listForm').addEventListener('submit', handleListItems);
  document.getElementById('getByIdForm').addEventListener('submit', handleGetById);
  document.getElementById('textSearchForm').addEventListener('submit', handleTextSearch);
  document.getElementById('categoryCountForm').addEventListener('submit', handleCategoryCount);
  document.getElementById('replaceForm').addEventListener('submit', handleReplace);
  document.getElementById('patchForm').addEventListener('submit', handlePatch);
  document.getElementById('upsertForm').addEventListener('submit', handleUpsert);
  document.getElementById('deleteForm').addEventListener('submit', handleDelete);
  document.getElementById('bulkDeleteForm').addEventListener('submit', handleBulkDelete);
  document.getElementById('countForm').addEventListener('submit', handleCount);
  document.getElementById('bulkUpdateForm').addEventListener('submit', handleBulkUpdate);
  document.getElementById('importSampleForm').addEventListener('submit', handleImportSample);
}

// Toggle operations panel
function toggleOperationsPanel() {
  const panel = document.getElementById('operationsPanel');
  const button = document.getElementById('toggleOperations');
  
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    button.textContent = '📋 Hide Operations';
  } else {
    panel.classList.add('hidden');
    button.textContent = '🛠️ Show All Operations';
  }
}

// Load and display current items
async function loadItems() {
  const container = document.getElementById('itemsGrid');
  container.innerHTML = '<div class="loading">Loading items...</div>';
  
  try {
    const res = await fetch(apiRoot);
    const json = await res.json();
    
    const items = json.docs || [];
    renderItems(items);
    await updateStats();
    updatePaginationInfo(json);
  } catch (err) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-text">Error loading items: ${err.message}</div>
    </div>`;
  }
}

// Render items in the grid
function renderItems(items) {
  const container = document.getElementById('itemsGrid');
  
  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📦</div>
      <div class="empty-state-text">No items found. Use the operations panel to create items!</div>
    </div>`;
    return;
  }
  
  container.innerHTML = items.map(item => `
    <div class="item-card" data-id="${item._id}">
      <div class="item-header">
        <div class="item-name">${escapeHtml(item.name)}</div>
        ${item.category ? `<span class="item-category">${escapeHtml(item.category)}</span>` : ''}
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
        <div class="item-stat">
          <div class="item-stat-label">ID</div>
          <div class="item-stat-value copy-id" onclick="copyToClipboard('${item._id}')" title="Click to copy">${item._id.substring(0, 8)}...</div>
        </div>
      </div>
    </div>
  `).join('');
}

// Update stats dashboard
async function updateStats() {
  try {
    const [countRes, aggRes, itemsRes] = await Promise.all([
      fetch(apiRoot + '/meta/count'),
      fetch(apiRoot + '/aggregate/category-count'),
      fetch(apiRoot)
    ]);
    
    const countData = await countRes.json();
    const aggData = await aggRes.json();
    const itemsData = await itemsRes.json();
    
    const items = itemsData.docs || [];
    const totalItems = countData.count || 0;
    const totalCategories = Array.isArray(aggData) ? aggData.length : 0;
    const totalValue = items.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 0)), 0);
    const avgPrice = items.length > 0 ? items.reduce((sum, item) => sum + (item.price || 0), 0) / items.length : 0;
    
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('totalCategories').textContent = totalCategories;
    document.getElementById('totalValue').textContent = '$' + totalValue.toFixed(2);
    document.getElementById('avgPrice').textContent = '$' + avgPrice.toFixed(2);
  } catch (err) {
    console.error('Error updating stats:', err);
  }
}

// ========================= OPERATION HANDLERS =========================

// 1. Create Single Item
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

  await executeOperation('POST', apiRoot, data, 'createResult', e.target);
}

// 2. Bulk Insert
async function handleBulkInsert(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  try {
    const items = JSON.parse(formData.get('items'));
    await executeOperation('POST', apiRoot + '/bulk', { items }, 'bulkInsertResult', e.target);
  } catch (error) {
    showResult('bulkInsertResult', { error: 'Invalid JSON format' }, 'error');
  }
}

// 3. List/Filter Items
async function handleListItems(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  const params = new URLSearchParams();
  ['q', 'category', 'minQty', 'maxQty', 'page', 'limit', 'sort'].forEach(key => {
    const value = formData.get(key);
    if (value) params.append(key, value);
  });
  
  await executeOperation('GET', apiRoot + '?' + params.toString(), null, 'listResult');
}

// 4. Get by ID
async function handleGetById(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const id = formData.get('id');
  
  await executeOperation('GET', apiRoot + '/' + id, null, 'getByIdResult');
}

// 5. Text Search
async function handleTextSearch(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const q = formData.get('q');
  
  await executeOperation('GET', apiRoot + '/search/text?q=' + encodeURIComponent(q), null, 'textSearchResult');
}

// 6. Category Count Aggregation
async function handleCategoryCount(e) {
  e.preventDefault();
  await executeOperation('GET', apiRoot + '/aggregate/category-count', null, 'categoryCountResult');
}

// 7. Replace Item (PUT)
async function handleReplace(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const id = formData.get('id');
  
  try {
    const data = JSON.parse(formData.get('data'));
    await executeOperation('PUT', apiRoot + '/' + id, data, 'replaceResult', e.target);
  } catch (error) {
    showResult('replaceResult', { error: 'Invalid JSON format' }, 'error');
  }
}

// 8. Partial Update (PATCH)
async function handlePatch(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const id = formData.get('id');
  
  try {
    const data = JSON.parse(formData.get('data'));
    await executeOperation('PATCH', apiRoot + '/' + id, data, 'patchResult', e.target);
  } catch (error) {
    showResult('patchResult', { error: 'Invalid JSON format' }, 'error');
  }
}

// 9. Upsert
async function handleUpsert(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const id = formData.get('id');
  
  try {
    const data = JSON.parse(formData.get('data'));
    await executeOperation('PUT', apiRoot + '/' + id + '/upsert', data, 'upsertResult', e.target);
  } catch (error) {
    showResult('upsertResult', { error: 'Invalid JSON format' }, 'error');
  }
}

// 10. Delete One
async function handleDelete(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const id = formData.get('id');
  
  if (!confirm('Are you sure you want to delete this item?')) return;
  
  await executeOperation('DELETE', apiRoot + '/' + id, null, 'deleteResult', e.target);
}

// 11. Bulk Delete
async function handleBulkDelete(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  try {
    const ids = JSON.parse(formData.get('ids'));
    if (!confirm(`Are you sure you want to delete ${ids.length} items?`)) return;
    
    await executeOperation('DELETE', apiRoot, { ids }, 'bulkDeleteResult', e.target);
  } catch (error) {
    showResult('bulkDeleteResult', { error: 'Invalid JSON format' }, 'error');
  }
}

// 12. Count Items
async function handleCount(e) {
  e.preventDefault();
  await executeOperation('GET', apiRoot + '/meta/count', null, 'countResult');
}

// 13. Bulk Update
async function handleBulkUpdate(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  try {
    const ids = JSON.parse(formData.get('ids'));
    const delta = Number(formData.get('delta')) || 1;
    
    await executeOperation('PATCH', apiRoot + '/bulk-update', { ids, delta }, 'bulkUpdateResult', e.target);
  } catch (error) {
    showResult('bulkUpdateResult', { error: 'Invalid JSON format' }, 'error');
  }
}

// 14. Import Sample Data
async function handleImportSample(e) {
  e.preventDefault();
  await executeOperation('POST', apiRoot + '/import-sample', {}, 'importSampleResult', e.target);
}

// Quick import sample (header button)
async function importSample() {
  try {
    const res = await fetch(apiRoot + '/import-sample', { method: 'POST' });
    const data = await res.json();
    
    if (res.ok) {
      showToast('✅ Sample data imported!', 'success');
      loadItems();
    } else {
      showToast('❌ Error importing sample data', 'error');
    }
  } catch (err) {
    showToast('❌ Error importing sample data', 'error');
  }
}

// ========================= UTILITY FUNCTIONS =========================

// Execute API operation and show result
async function executeOperation(method, url, data, resultElementId, formElement = null) {
  const resultElement = document.getElementById(resultElementId);
  resultElement.innerHTML = '<div class="loading">Processing...</div>';
  
  try {
    const options = {
      method,
      headers: {}
    };
    
    if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
    
    // Show request details
    const requestInfo = `
      <div class="request-info">
        <strong>Request:</strong> ${method} ${url}
        ${data ? `<br><strong>Body:</strong> <pre>${JSON.stringify(data, null, 2)}</pre>` : ''}
      </div>
    `;
    
    const startTime = Date.now();
    const res = await fetch(url, options);
    const responseTime = Date.now() - startTime;
    const responseData = await res.json();
    
    if (res.ok) {
      showResult(resultElementId, responseData, 'success', requestInfo, responseTime);
      
      // Clear form if specified and operation was successful
      if (formElement && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
        formElement.reset();
      }
      
      // Refresh items if it was a modifying operation
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        setTimeout(() => loadItems(), 500);
      }
    } else {
      showResult(resultElementId, responseData, 'error', requestInfo, responseTime);
    }
  } catch (error) {
    showResult(resultElementId, { error: error.message }, 'error');
  }
}

// Show operation result
function showResult(elementId, data, type, requestInfo = '', responseTime = 0) {
  const element = document.getElementById(elementId);
  const isSuccess = type === 'success';
  
  element.innerHTML = `
    ${requestInfo}
    <div class="response-info">
      <strong>Response:</strong> ${isSuccess ? '✅' : '❌'} ${responseTime > 0 ? `(${responseTime}ms)` : ''}
      <pre class="response-data ${type}">${JSON.stringify(data, null, 2)}</pre>
    </div>
  `;
}

// Update pagination info
function updatePaginationInfo(json) {
  const info = document.getElementById('paginationInfo');
  if (json.docs && json.docs.length > 0) {
    info.textContent = `Showing ${json.docs.length} of ${json.total || json.docs.length} items`;
  } else {
    info.textContent = '';
  }
}

// Show toast notification
function showToast(message, type = 'success') {
  // Create toast if it doesn't exist
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Copy to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 ID copied to clipboard!', 'success');
  }).catch(() => {
    showToast('❌ Failed to copy ID', 'error');
  });
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}