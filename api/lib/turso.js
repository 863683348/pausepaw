/**
 * Turso 数据库连接模块
 */
import { createClient } from '@libsql/client';

let _client = null;

export function getTursoClient() {
  if (_client) return _client;
  
  const dbUrl = process.env.TURSO_DATABASE_URL || '';
  const authToken = process.env.TURSO_AUTH_TOKEN || '';
  
  if (!dbUrl || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required');
  }
  
  _client = createClient({
    url: dbUrl,
    authToken: authToken
  });
  
  return _client;
}

export function getDb() {
  const client = getTursoClient();
  return {
    prepare: (sql) => ({
      get: (...args) => {
        const result = client.execute({ sql, args });
        return result.rows[0] || null;
      },
      run: (...args) => {
        const result = client.execute({ sql, args: Array.isArray(args[0]) ? args[0] : args });
        return { lastInsertRowid: result.lastInsertRowid };
      },
      all: (...args) => {
        const result = client.execute({ sql, args: Array.isArray(args[0]) ? args[0] : args });
        return result.rows || [];
      }
    }),
    exec: (sql) => {
      client.execute({ sql });
    }
  };
}
