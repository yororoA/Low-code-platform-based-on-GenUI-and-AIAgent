interface DataItem {
  id: string;
  name: string;
  value: string;
}

type OperationType = 'open' | 'close' | 'add' | 'update' | 'delete' | 'get' | 'getByIndex';


export function DBOperation(operationType: OperationType, data?: DataItem, id?: string, indexName?: string, indexValue?: string) {
  const DB_NAME = 'test-db';
  const STORE_NAME = 'test-store';
  const MAX_RETRY = 3;
  let retryCount: number = 0;
  let openRequest: IDBOpenDBRequest;
  let isOpen: boolean = false;
  let db: IDBDatabase = null as unknown as IDBDatabase;

  if (operationType === 'open') {
    openDB();
  } else if (operationType === 'close') {
    if (isOpen && db) {
      db.close();
      isOpen = false;
      console.log('IndexedDB closed successfully');
    }
  } else {
    if (!isOpen) openDB();
    switch (operationType) {
      case 'add':
        if (data) addData(data);
        else throw new Error('Data is required');
        break;
      case 'update':
        if (data) updateData(data);
        else throw new Error('Data is required');
        break;
      case 'delete':
        if (id !== undefined) deleteData(id);
        else throw new Error('ID is required');
        break;
      case 'get':
        if (id !== undefined) readData(id);
        else throw new Error('ID is required');
        break;
      case 'getByIndex':
        if (indexName && indexValue) readDataByIndex(indexName, indexValue);
        else throw new Error('Index name and value are required');
        break;
      default:
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
  function readData(id: string) {
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

  // 更新数据(全量覆盖)
  function updateData(data: DataItem) {
    const transaction = db.transaction(STORE_NAME, 'readwrite'); // 开启相应表的读写事务
    const store = transaction.objectStore(STORE_NAME); // 获取相应表
    // put 会根据数据中主键判断该数据为新增还是更新
    // 如果数据中主键在表中不存在，则执行添加操作；如果存在，则执行更新操作（全量覆盖）
    const request = store.put(data); // 更新数据

    request.onsuccess = () => console.log('Data updated successfully:', request.result);
    request.onerror = () => console.error('Error updating data:', request.error);
  }

  // 删除数据
  function deleteData(id: string) {
    const transaction = db.transaction(STORE_NAME, 'readwrite'); // 开启相应表的读写事务
    const store = transaction.objectStore(STORE_NAME); // 获取相应表
    const request = store.delete(id); // 根据主键删除数据

    request.onsuccess = () => console.log('Data deleted successfully:', id);
    request.onerror = () => console.error('Error deleting data:', request.error);
  }
}



abstract class Vehicle {
  constructor(
    public color: string,
    public brand: string,
  ){}
}

class Bicycle extends Vehicle {
  public owner: string;

  constructor(
    color: string,
    brand: string,
    owner: string,
  ){
    super(color, brand);
    this.owner = owner;
  }
}

class Headlight {}
class Motor{}
class Auto extends Vehicle {
  public owners: Person[];
  public headlights: Headlight[];
  public motor: Motor;

  constructor(
    color: string,
    brand: string,
    owners: Person[],
  ){
    super(color, brand);
    this.owners = owners;
    this.headlights = [new Headlight(), new Headlight()];
    this.motor = new Motor();

    owners.forEach(owner => owner.addVehicle(this));
  }
}

abstract class Person {
  private vehicles: Vehicle[] = [];

  constructor(
    public name: string,
    public age: number,
    public gender: string,
  ){}

  public addVehicle(vehicle: Vehicle) {
    this.vehicles.push(vehicle);
  }

  public getVehicles() {
    return this.vehicles;
  }
}