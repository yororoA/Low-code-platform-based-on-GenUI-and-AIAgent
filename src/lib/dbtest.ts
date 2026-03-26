interface DataItem {
  id: number;
  name: string;
  value: string;
}

type OperationType = 'open' | 'add' | 'update' | 'delete' | 'get' | 'getAll';


export function DBOperation(operationType: OperationType, data?: DataItem) {
  const DB_NAME = 'test-db';
  const STORE_NAME = 'test-store';
  const MAX_RETRY = 3;
  let retryCount: number = 0;
  let openRequest: IDBOpenDBRequest;
  let isOpen: boolean = false;
  let db: IDBDatabase;

  if (operationType === 'open') {
    openDB();
  } else {
    if (!isOpen) openDB();
    switch (operationType) {
      case 'add':
        if (data) addData(data);
        else throw new Error('Data is required');
        break;
    }
  }


  // 打开数据库
  function openDB() {
    openRequest = window.indexedDB.open(DB_NAME);
    // 失败重试
    openRequest.onerror = (event) => {
      console.error('Error opening IndexedDB:', event);
      if (retryCount++ < MAX_RETRY) {
        openDB();
      }
      throw new Error('Error opening IndexedDB');
    };
    // 成功
    openRequest.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      isOpen = true;
      console.log('IndexedDB opened successfully:', db);
    };
    // 首次创建/版本升级
    openRequest.onupgradeneeded = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' }); // 创建相应表
        store.createIndex('nameIndex', 'name', { unique: false }); // 创建索引
      }
    };
  }

  // 添加数据
  function addData(data: DataItem) {
    const transaction = db.transaction(STORE_NAME, 'readwrite'); // 开启相应表的读写事务
    const store = transaction.objectStore(STORE_NAME); // 获取相应表
    const request = store.add(data); // 添加数据

    request.onsuccess = () => console.log('Data added successfully:', request.result);
    request.onerror = () => console.error('Error adding data:', request.error);
  }

  // 读取数据
  function readData(id: number) {
    const transaction = db.transaction(STORE_NAME, 'readonly'); // 开启相应表的只读事务
    const store = transaction.objectStore(STORE_NAME); // 获取相应表
    const request = store.get(id); // 获取数据

    request.onsuccess = () => console.log('Data read successfully:', request.result);
    request.onerror = () => console.error('Error reading data:', request.error);
  }

  // 根据索引读取数据
  function readDataByIndex(indexName: string, indexValue: string) {
    const transaction = db.transaction(STORE_NAME, 'readonly'); // 开启相应表的只读事务
    const store = transaction.objectStore(STORE_NAME); // 获取相应表
    const index = store.index(indexName); // 获取索引
    const request = index.get(indexValue); // 获取数据

    request.onsuccess = () => console.log('Data read successfully:', request.result);
    request.onerror = () => console.error('Error reading data:', request.error);
  }
}