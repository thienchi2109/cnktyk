import { neon } from '@neondatabase/serverless';

// Database client class for managing connections and queries
export class DatabaseClient {
  private sql: ReturnType<typeof neon>;
  private connectionString: string;

  constructor(connectionString?: string) {
    this.connectionString = connectionString || process.env.DATABASE_URL!;
    
    if (!this.connectionString) {
      throw new Error('Database connection string is required');
    }

    this.sql = neon(this.connectionString);
  }

  // Execute a single query with parameters
  async query<T = any>(
    text: string, 
    params: any[] = []
  ): Promise<T[]> {
    try {
      // Use the .query method for parameterized queries
      const result = await (this.sql as any).query(text, params) as { rows?: T[] };
      if (result && Array.isArray(result.rows)) {
        return result.rows;
      }

      // Some neon helpers may return the rows array directly; handle that as a fallback.
      if (Array.isArray(result)) {
        return result as T[];
      }

      console.error('Unexpected query result shape:', result);
      throw new Error('Unexpected database response format');
    } catch (error) {
      console.error('Database query error:', error);
      throw new Error(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Execute a query and return the first row
  async queryOne<T = any>(
    text: string, 
    params: any[] = []
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.length > 0 ? result[0] : null;
  }

  // Execute a query and expect exactly one row
  async queryOneRequired<T = any>(
    text: string, 
    params: any[] = []
  ): Promise<T> {
    const result = await this.queryOne<T>(text, params);
    if (!result) {
      throw new Error('Expected one row, but got none');
    }
    return result;
  }

  // Execute multiple queries in sequence (pseudo-transaction)
  async executeInSequence<T = any>(
    queries: Array<{ text: string; params?: any[] }>
  ): Promise<T[]> {
    const results: T[] = [];
    
    try {
      for (const query of queries) {
        const result = await this.query<T>(query.text, query.params || []);
        results.push(...result);
      }
      return results;
    } catch (error) {
      console.error('Sequential execution failed:', error);
      throw error;
    }
  }

  // Insert a record and return the inserted data
  async insert<T = any>(
    table: string,
    data: Record<string, any>,
    returning: string = '*'
  ): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO "${table}" (${columns.map(col => `"${col}"`).join(', ')})
      VALUES (${placeholders})
      RETURNING ${returning}
    `;
    
    const result = await this.queryOneRequired<T>(query, values);
    return result;
  }

  // Update records and return updated data
  async update<T = any>(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>,
    returning: string = '*'
  ): Promise<T[]> {
    const setClause = Object.keys(data)
      .map((key, index) => `"${key}" = $${index + 1}`)
      .join(', ');
    
    const whereClause = Object.keys(where)
      .map((key, index) => `"${key}" = $${Object.keys(data).length + index + 1}`)
      .join(' AND ');
    
    const values = [...Object.values(data), ...Object.values(where)];
    
    const query = `
      UPDATE "${table}"
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING ${returning}
    `;
    
    return this.query<T>(query, values);
  }

  // Delete records and return deleted data
  async delete<T = any>(
    table: string,
    where: Record<string, any>,
    returning: string = '*'
  ): Promise<T[]> {
    const whereClause = Object.keys(where)
      .map((key, index) => `"${key}" = $${index + 1}`)
      .join(' AND ');
    
    const values = Object.values(where);
    
    const query = `
      DELETE FROM "${table}"
      WHERE ${whereClause}
      RETURNING ${returning}
    `;
    
    return this.query<T>(query, values);
  }

  // Check if a record exists
  async exists(
    table: string,
    where: Record<string, any>
  ): Promise<boolean> {
    const whereClause = Object.keys(where)
      .map((key, index) => `"${key}" = $${index + 1}`)
      .join(' AND ');
    
    const values = Object.values(where);
    
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM "${table}" WHERE ${whereClause}
      ) as exists
    `;
    
    const result = await this.queryOne<{ exists: boolean }>(query, values);
    return result?.exists || false;
  }

  // Count records
  async count(
    table: string,
    where?: Record<string, any>
  ): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM "${table}"`;
    let values: any[] = [];
    
    if (where && Object.keys(where).length > 0) {
      const whereClause = Object.keys(where)
        .map((key, index) => `"${key}" = $${index + 1}`)
        .join(' AND ');
      
      query += ` WHERE ${whereClause}`;
      values = Object.values(where);
    }
    
    const result = await this.queryOne<{ count: string }>(query, values);
    return parseInt(result?.count || '0', 10);
  }

  // Paginated query
  async paginate<T = any>(
    baseQuery: string,
    params: any[] = [],
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM (${baseQuery}) as count_query`;
    const countResult = await this.queryOne<{ count: string }>(countQuery, params);
    const total = parseInt(countResult?.count || '0', 10);
    
    // Get paginated data
    const offset = (page - 1) * limit;
    const paginatedQuery = `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const data = await this.query<T>(paginatedQuery, [...params, limit, offset]);
    
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // Test database connection
  async testConnection(): Promise<boolean> {
    try {
      await this.sql`SELECT 1 as test`;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  // Get database version and info
  async getDatabaseInfo(): Promise<{
    version: string;
    currentDatabase: string;
    currentUser: string;
    serverTime: Date;
  }> {
    const result = await this.queryOne<{
      version: string;
      current_database: string;
      current_user: string;
      now: Date;
    }>(`
      SELECT 
        version() as version,
        current_database() as current_database,
        current_user as current_user,
        now() as now
    `);
    
    if (!result) {
      throw new Error('Failed to get database info');
    }
    
    return {
      version: result.version,
      currentDatabase: result.current_database,
      currentUser: result.current_user,
      serverTime: result.now,
    };
  }
}

// Create a singleton instance for the application (lazy initialization)
let _db: DatabaseClient | null = null;

export const db = new Proxy({} as DatabaseClient, {
  get(target, prop) {
    if (!_db) {
      _db = new DatabaseClient();
    }
    const value = _db[prop as keyof DatabaseClient];
    return typeof value === 'function' ? value.bind(_db) : value;
  }
});

// Export the base SQL function for direct queries when needed
export { sql } from './connection';
