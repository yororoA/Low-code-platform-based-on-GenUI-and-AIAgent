import { AdminAgentMessage } from "@/app/api/chat/model";


interface DataItem {
  id: string;
  timestamp: Date;
  topic: string;
  messages: AdminAgentMessage[];
}

type OperationType = 'new_store' | 'open' | 'close' | 'add' | 'update' | 'delete' | 'get' | 'getByIndex' | 'getAllByIndex' | 'getAllIndexValue' | 'getAllIds' | 'getSummary';

interface ExecuteOptions {
  operationType: OperationType;
  store_name?: string;
  data?: DataItem;
  id?: string;
  indexName?: string;
  indexValue?: string,
}

// 使用类封装以维持数据库连接状态，或使用外部变量
class DBManager {
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
          store.createIndex('timestampIndex', 'timestamp', { unique: false });
          store.createIndex('topicIndex', 'topic', { unique: false });
          console.log(`表 ${targetStore} 创建成功，版本升级至: ${nextVersion}`);
        }
      };

      request.onsuccess = async () => {
        this.db = request.result;

        // 兼容历史版本：如果数据库已存在但目标表不存在，自动触发一次升级创建表
        if (targetStore && !this.db.objectStoreNames.contains(targetStore) && !forceUpgrade) {
          this.db.close();
          this.db = null;
          try {
            const upgradedDB = await this.getDB(targetStore, true);
            resolve(upgradedDB);
          } catch (error) {
            reject(error);
          }
          return;
        }

        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("IndexedDB open blocked by another connection"));
    });
  }

  // 对外暴露的统一操作接口
  static async execute(options: ExecuteOptions) {
    const {
      operationType,
      store_name = 'test-store',
      data, id, indexName, indexValue,
    } = options;

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
      const isReadOnly =
        operationType === 'get' ||
        operationType === 'getByIndex' ||
        operationType === 'getAllByIndex';
      const transaction = db.transaction(store_name, isReadOnly ? 'readonly' : 'readwrite');
      const store = transaction.objectStore(store_name);
      let request: IDBRequest;

      switch (operationType) {
        case 'add': request = store.add(data!); break;
        case 'update': request = store.put(data!); break;
        case 'delete': request = store.delete(id!); break;
        case 'get': request = store.get(id!); break;
        case 'getAllIds': request = store.getAllKeys(); break;
        case 'getByIndex': request = store.index(indexName!).get(indexValue!); break;
        case 'getAllByIndex': request = store.index(indexName!).getAll(); break;
        case 'getAllIndexValue': {
          request = store.index(indexName!).openKeyCursor(null, 'nextunique');
          const results: unknown[] = [];
          return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursor>).result;
              if (cursor) {
                results.push(cursor.key);
                cursor.continue();
              } else {
                resolve(results);
              }
            }
            request.onerror = () => {
              reject(request.error);
            }
          })
        }
        case 'getSummary': {
          const index = store.index(indexName!);
          const results: { id: string, timestamp: Date, topic: string }[] = [];
          const request = index.openCursor();
          return new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursor>).result as IDBCursorWithValue;
              if (cursor) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const rest = (({messages, ...rest})=>rest)(cursor.value);
                results.push(rest);
                cursor.continue();
              } else {
                resolve(results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
              }
            }
            request.onerror = () => {
              reject(request.error);
            }
          });
        }
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

export { type DataItem, DBManager, type OperationType, type ExecuteOptions };