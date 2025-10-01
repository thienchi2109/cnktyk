// Database connection and client
export { sql, connectToDatabase, executeQuery, executeTransaction, checkDatabaseHealth } from './connection';
export { db, DatabaseClient } from './client';

// Schemas and types
export * from './schemas';

// Migration system
export { 
  migrationManager, 
  MigrationManager, 
  applyInitialSchema, 
  setupDatabase,
  type Migration 
} from './migrations';

// Repository pattern
export {
  taiKhoanRepo,
  nhanVienRepo,
  ghiNhanHoatDongRepo,
  donViRepo,
  danhMucHoatDongRepo,
  thongBaoRepo,
  nhatKyHeThongRepo,
  TaiKhoanRepository,
  NhanVienRepository,
  GhiNhanHoatDongRepository,
  DonViRepository,
  DanhMucHoatDongRepository,
  ThongBaoRepository,
  NhatKyHeThongRepository,
} from './repositories';

// Database utilities
export * from './utils';
export { dbUtils } from './utils';

// Utility functions for common database operations
export async function initializeDatabase() {
  const { setupDatabase } = await import('./migrations');
  const result = await setupDatabase();
  
  if (!result.success) {
    throw new Error(`Database initialization failed: ${result.message}`);
  }
  
  return result;
}

// Health check function
export async function getDatabaseStatus() {
  try {
    const health = await checkDatabaseHealth();
    const info = await db.getDatabaseInfo();
    
    return {
      status: health.status,
      latency: health.latency,
      database: info,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      status: 'error' as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}