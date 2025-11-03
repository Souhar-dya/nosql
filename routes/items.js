const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Item = require('../models/Item');

// 1) Create single item
router.post('/', async (req, res) => {
  try {
    const item = new Item(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2) Bulk insert
router.post('/bulk', async (req, res) => {
  try {
    const docs = req.body.items || [];
    if (!Array.isArray(docs)) return res.status(400).json({ error: 'items must be an array' });
    const result = await Item.insertMany(docs, { ordered: false });
    res.json({ inserted: result.length, docs: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3) List / filtered / paginated / sorted / search via query params
// Query params: q (text), category, minQty, maxQty, page, limit, sort
router.get('/', async (req, res) => {
  try {
    const { q, category, minQty, maxQty, page = 1, limit = 20, sort } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (minQty) filter.qty = { ...(filter.qty || {}), $gte: Number(minQty) };
    if (maxQty) filter.qty = { ...(filter.qty || {}), $lte: Number(maxQty) };

    let query;
    if (q) {
      query = Item.find({ $text: { $search: q }, ...filter }, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    } else {
      query = Item.find(filter);
    }

    if (sort) {
      // example: sort=price:asc or sort=qty:desc
      const [field, dir] = sort.split(':');
      query = query.sort({ [field]: dir === 'desc' ? -1 : 1 });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Item.countDocuments(filter);
    const docs = await query.skip(skip).limit(Number(limit));
    res.json({ total, page: Number(page), limit: Number(limit), docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4) Get by id
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5) Text search (alias)
router.get('/search/text', async (req, res) => {
  try {
    const q = req.query.q || '';
    const docs = await Item.find({ $text: { $search: q } }, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } }).limit(50);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6) Aggregation: count by category
router.get('/aggregate/category-count', async (req, res) => {
  try {
    const rows = await Item.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7) Replace (PUT)
router.put('/:id', async (req, res) => {
  try {
    const opts = { new: true, overwrite: true, runValidators: true };
    const doc = await Item.findOneAndReplace({ _id: req.params.id }, req.body, opts);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 8) Partial update (PATCH)
router.patch('/:id', async (req, res) => {
  try {
    const doc = await Item.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9) Upsert (update or insert)
router.put('/:id/upsert', async (req, res) => {
  try {
    const doc = await Item.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true, upsert: true, setDefaultsOnInsert: true });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 10) Delete one
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Item.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ deletedId: req.params.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 11) Bulk delete by ids
router.delete('/', async (req, res) => {
  try {
    const ids = req.body.ids || [];
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
    const objectIds = ids.map(i => mongoose.Types.ObjectId(i));
    const result = await Item.deleteMany({ _id: { $in: objectIds } });
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 12) Count
router.get('/meta/count', async (req, res) => {
  try {
    const count = await Item.countDocuments({});
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13) Bulk update (e.g., increment qty by delta for list of ids)
router.patch('/bulk-update', async (req, res) => {
  try {
    const { ids = [], delta = 0 } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
    const objectIds = ids.map(i => mongoose.Types.ObjectId(i));
    const result = await Item.updateMany({ _id: { $in: objectIds } }, { $inc: { qty: Number(delta) } });
    res.json({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 14) Import sample data (convenience)
router.post('/import-sample', async (req, res) => {
  try {
    const sample = [
      { name: 'Apple', category: 'Fruit', qty: 50, price: 0.5, tags: ['fresh', 'food'] },
      { name: 'Banana', category: 'Fruit', qty: 80, price: 0.3, tags: ['yellow'] },
      { name: 'Hammer', category: 'Tools', qty: 15, price: 9.99, tags: ['hardware'] }
    ];
    const docs = await Item.insertMany(sample);
    res.json({ inserted: docs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
