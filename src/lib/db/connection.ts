import { neon } from '@neondatabase/serverless';

// Lazy connection initialization
let _sql: ReturnType<typeof neon> | null = null;

function getConnection() {
  if (!_sql) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    _sql = neon(connectionString);
  }
  
  return _sql;
}

// Export the lazy connection
export const sql = new Proxy({} as ReturnType<typeof neon>, {
  get(target, prop) {
    const connection = getConnection();
    return connection[prop as keyof typeof connection];
  },
  apply(target, thisArg, argArray) {
    const connection = getConnection();
    return (connection as any).apply(thisArg, argArray);
  }
});

// Connection utility with error handling
export async function connectToDatabase() {
  try {
    // Test the connection
    const connection = getConnection();
    await connection`SELECT 1 as test`;
    return { success: true, message: 'Database connection successful' };
  } catch (error) {
    console.error('Database connection failed:', error);
    return { 
      success: false, 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Query execution wrapper with error handling
export async function executeQuery<T = any>(
  query: string,
  params: any[] = []
): Promise<{ success: boolean; data?: T[]; error?: string }> {
  try {
    const connection = getConnection();
    const result = await connection.query(query, params);
    return { success: true, data: result as T[] };
  } catch (error) {
    console.error('Query execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Query execution failed'
    };
  }
}

// Transaction wrapper for multiple operations
export async function executeTransaction<T>(
  operations: Array<() => Promise<any>>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    // Note: Neon serverless doesn't support traditional transactions
    // We'll execute operations sequentially and handle rollback manually if needed
    const results = [];
    
    for (const operation of operations) {
      const result = await operation();
      results.push(result);
    }
    
    return { success: true, data: results as T };
  } catch (error) {
    console.error('Transaction failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed'
    };
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const connection = getConnection();
    await connection`SELECT 1 as health_check`;
    const latency = Date.now() - startTime;
    
    return {
      status: 'healthy',
      latency
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Health check failed'
    };
  }
}