const openRequest = window.indexedDB.open('test-db');

openRequest.onerror = (event) => {
  console.error('Error opening IndexedDB:', event);
};

openRequest.onsuccess = (event) => {
  const db = (event.target as IDBOpenDBRequest).result;
  console.log('IndexedDB opened successfully:', db);
};

openRequest.onupgradeneeded = (event) => {
  const db = (event.target as IDBOpenDBRequest).result;
  if (!db.objectStoreNames.contains('test-store')) {
   const store = db.createObjectStore('test-store', { keyPath: 'id' });
    store.createIndex('name', 'name', { unique: false });
  }
};

function addItem(item: { id: number; name: string, value: string }) {
  const openRequest = window.indexedDB.open('test-db');
  openRequest.onsuccess = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    const transaction = db.transaction('test-store', 'readwrite');
    const store = transaction.objectStore('test-store');
    const request = store.add(item);

    request.onsuccess = () => {
      console.log('Item added:', item);
    };
    request.onerror = (event) => {
      console.error('Error adding item:', event);
    };
  };
  openRequest.onerror = (event) => {
    console.error('Error opening IndexedDB:', event);
  };
}

addItem({ id: 1, name: 'Test Item', value: 'This is a test.' });