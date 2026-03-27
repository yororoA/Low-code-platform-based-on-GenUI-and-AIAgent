interface DataItem {
  id: string;
  name: string;
  value: string;
}

type OperationType = 'new_store' | 'open' | 'close' | 'add' | 'update' | 'delete' | 'get' | 'getByIndex';


// 使用类封装以维持数据库连接状态，或使用外部变量
export class DBManager {
  private static db: IDBDatabase | null = null;
  private static DB_NAME = 'test-db';

  // 获取当前数据库实例（如果没打开则打开）
  private static async getDB(targetStore?: string, forceUpgrade: boolean = false): Promise<IDBDatabase> {
    // 1. 如果已打开且不需要升级，直接返回
    if (this.db && !forceUpgrade) return this.db;

    // 2. 如果需要升级（新表），先关闭旧连接
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // 3. 探测当前版本（如果不传版本号打开，可以获取当前最新版本）
    const currentVersion = await new Promise<number>((resolve) => {
      const req = window.indexedDB.open(this.DB_NAME);
      req.onsuccess = () => {
        const v = req.result.version;
        req.result.close();
        resolve(v);
      };
    });

    const nextVersion = forceUpgrade ? currentVersion + 1 : currentVersion;

    // 4. 正式打开/升级
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.DB_NAME, nextVersion);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (targetStore && !db.objectStoreNames.contains(targetStore)) {
          const store = db.createObjectStore(targetStore, { keyPath: 'id' });
          store.createIndex('nameIndex', 'name', { unique: false });
          console.log(`表 ${targetStore} 创建成功，版本升级至: ${nextVersion}`);
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // 对外暴露的统一操作接口
  static async execute(
    operationType: OperationType,
    store_name: string = 'test-store',
    params: { data?: DataItem; id?: string; indexName?: string; indexValue?: string } = {}
  ) {
    const { data, id, indexName, indexValue } = params;

    try {
      // 处理“新建表”逻辑：强制升级版本
      if (operationType === 'new_store') {
        await this.getDB(store_name, true);
        return;
      }

      const db = await this.getDB(store_name);

      // 打开数据库
      if (operationType === 'open') {
        await this.getDB(store_name); // 确保连接被建立
        console.log("数据库预开启完成");
        return;
      }

      // 关闭连接
      if (operationType === 'close') {
        db.close();
        this.db = null;
        console.log('Database closed');
        return;
      }

      // 执行具体的 CRUD 操作
      const transaction = db.transaction(store_name, operationType === 'get' || operationType === 'getByIndex' ? 'readonly' : 'readwrite');
      const store = transaction.objectStore(store_name);
      let request: IDBRequest;

      switch (operationType) {
        case 'add': request = store.add(data!); break;
        case 'update': request = store.put(data!); break;
        case 'delete': request = store.delete(id!); break;
        case 'get': request = store.get(id!); break;
        case 'getByIndex': request = store.index(indexName!).get(indexValue!); break;
        default: return;
      }

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log(`${operationType} 操作成功:`, request.result || id);
          resolve(request.result);
        };
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error(`操作 ${operationType} 失败:`, error);
    }
  }
}



