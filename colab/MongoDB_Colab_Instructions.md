# MongoDB in Google Colab (PyMongo) — copy/paste-ready

Open a new Colab notebook and paste the following cells.

1) Install PyMongo

```python
!pip install pymongo[srv]
```

2) Connect to MongoDB (Atlas recommended). Set your URI (replace `<YOUR_URI>`)

```python
from pymongo import MongoClient

MONGODB_URI = '<YOUR_MONGODB_URI>'  # e.g. mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/mydb?retryWrites=true&w=majority
client = MongoClient(MONGODB_URI)
db = client.get_database()  # default database from URI or pass name: client['nosql-demo']
items = db['items']
```

3) Create one document

```python
item = { 'name': 'Colab Item', 'category': 'Demo', 'qty': 5, 'price': 1.23, 'description': 'Inserted from Colab', 'tags': ['colab','demo'] }
res = items.insert_one(item)
print('Inserted id', res.inserted_id)
```

4) Bulk insert

```python
docs = [ { 'name': f'Bulk {i}', 'category': 'Bulk', 'qty': i, 'price': 0.5 * i } for i in range(1,11) ]
res = items.insert_many(docs)
print('Inserted', len(res.inserted_ids))
```

5) Find / filter / paginate

```python
cursor = items.find({ 'category': 'Bulk' }).sort('price', 1).limit(5)
for d in cursor:
    print(d['name'], d['price'])
```

6) Text search (ensure you have created a text index in the collection first — you can do it from Colab):

```python
# create text index once
items.create_index([('name', 'text'), ('description', 'text'), ('tags', 'text')])

# search
q = 'Bulk'
cursor = items.find({ '$text': { '$search': q } }, { 'score': { '$meta': 'textScore' } }).sort([('score', { '$meta': 'textScore' })])
for d in cursor:
    print(d['name'])
```

7) Update / upsert / bulk update

```python
# single update
items.update_one({ 'name': 'Colab Item' }, { '$set': { 'price': 2.0 } })

# upsert
items.update_one({ 'name': 'Upserted' }, { '$set': { 'qty': 10 } }, upsert=True)

# bulk update increment
items.update_many({ 'category': 'Bulk' }, { '$inc': { 'qty': 2 } })
```

8) Aggregation

```python
pipeline = [ { '$group': { '_id': '$category', 'count': { '$sum': 1 } } }, { '$sort': { 'count': -1 } } ]
print(list(items.aggregate(pipeline)))
```

9) Delete / bulk delete

```python
items.delete_one({ 'name': 'Colab Item' })
items.delete_many({ 'category': 'Bulk' })
```

This Colab guide mirrors the API operations in the Node demo and can be run interactively. Ensure your IP/credentials allow connections to Atlas clusters.
