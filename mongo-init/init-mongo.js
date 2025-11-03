// Initialize the database with a user for the application
db = db.getSiblingDB('nosql-demo');

// Create a user for the application
db.createUser({
  user: 'app_user',
  pwd: 'app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'nosql-demo'
    }
  ]
});

// Create a sample collection
db.createCollection('items');

print('Database initialized successfully!');