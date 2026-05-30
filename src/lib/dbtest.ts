import { DataItemSummary, ExecuteOptions } from "@/types";

// 使用类封装以维持数据库连接状态，或使用外部变量
export class DBManager {
  private static db: IDBDatabase | null = null;
  private static DB_NAME = 'genui-studio-db';
  private static OLD_DB_NAME = 'test-db';
  private static OLD_STORE_NAME = 'test-store';
  private static getIndexedDB(): IDBFactory {
    const indexedDBRef = globalThis.indexedDB;
    if (!indexedDBRef) {
      throw new Error("IndexedDB is not available in current runtime");
    }
    return indexedDBRef;
  }

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
    const currentVersion = await new Promise<number>((resolve, reject) => {
      const req = this.getIndexedDB().open(this.DB_NAME);
      req.onsuccess = () => {
        const v = req.result.version;
        req.result.close();
        resolve(v);
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("IndexedDB version probe blocked by another connection"));
    });

    const nextVersion = forceUpgrade ? currentVersion + 1 : currentVersion;

    // 4. 正式打开/升级
    return new Promise((resolve, reject) => {
      const request = this.getIndexedDB().open(this.DB_NAME, nextVersion);

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

        try {
          await this.migrateFromOldDB(this.db);
        } catch (e) {
          console.error('数据迁移失败:', e);
        }

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

  private static migrateFromOldDB(newDB: IDBDatabase): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = this.getIndexedDB().open(this.OLD_DB_NAME);
      req.onsuccess = () => {
        const oldDB = req.result;
        if (!oldDB.objectStoreNames.contains(this.OLD_STORE_NAME)) {
          oldDB.close();
          this.getIndexedDB().deleteDatabase(this.OLD_DB_NAME);
          resolve();
          return;
        }
        const tx = oldDB.transaction(this.OLD_STORE_NAME, 'readonly');
        const store = tx.objectStore(this.OLD_STORE_NAME);
        const getAllReq = store.getAll();
        getAllReq.onsuccess = () => {
          const data = getAllReq.result;
          oldDB.close();
          if (data.length === 0) {
            this.getIndexedDB().deleteDatabase(this.OLD_DB_NAME);
            resolve();
            return;
          }
          if (!newDB.objectStoreNames.contains('conversations')) {
            this.getIndexedDB().deleteDatabase(this.OLD_DB_NAME);
            resolve();
            return;
          }
          const writeTx = newDB.transaction('conversations', 'readwrite');
          const writeStore = writeTx.objectStore('conversations');
          for (const item of data) {
            writeStore.put(item);
          }
          writeTx.oncomplete = () => {
            this.getIndexedDB().deleteDatabase(this.OLD_DB_NAME);
            resolve();
          };
          writeTx.onerror = () => reject(writeTx.error);
        };
        getAllReq.onerror = () => {
          oldDB.close();
          reject(getAllReq.error);
        };
      };
      req.onerror = () => resolve();
    });
  }

  // 对外暴露的统一操作接口
  static async execute(options: ExecuteOptions) {
    const {
      operationType,
      store_name = 'conversations',
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
        case 'delete': request = store.delete(id!); break;
        case 'add': request = store.add(data!); break;
        case 'update': request = store.put(data!); break;
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
          const results: DataItemSummary[] = [];
          const cursorReq = index.openCursor();
          return new Promise((resolve, reject) => {
            cursorReq.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursor>).result as IDBCursorWithValue;
              if (cursor) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const rest = (({messages, ...rest})=>rest as DataItemSummary)(cursor.value);
                results.push(rest);
                cursor.continue();
              } else {
                resolve(results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
              }
            }
            cursorReq.onerror = () => {
              reject(cursorReq.error);
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
      throw error;
    }
  }
}