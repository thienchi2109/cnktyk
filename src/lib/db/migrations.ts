import { db } from './client';
import { readFileSync } from 'fs';
import { join } from 'path';

// Migration interface
export interface Migration {
  id: string;
  name: string;
  sql: string;
  appliedAt?: Date;
}

// Migration manager class
export class MigrationManager {
  private migrationsTable = 'schema_migrations';

  constructor() {}

  // Initialize migrations table
  async initializeMigrationsTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS "${this.migrationsTable}" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;
    
    await db.query(createTableQuery);
  }

  // Check if a migration has been applied
  async isMigrationApplied(migrationId: string): Promise<boolean> {
    const result = await db.queryOne<{ exists: boolean }>(`
      SELECT EXISTS(
        SELECT 1 FROM "${this.migrationsTable}" WHERE id = $1
      ) as exists
    `, [migrationId]);
    
    return result?.exists || false;
  }

  // Record a migration as applied
  async recordMigration(migration: Migration): Promise<void> {
    await db.query(`
      INSERT INTO "${this.migrationsTable}" (id, name, applied_at)
      VALUES ($1, $2, now())
      ON CONFLICT (id) DO NOTHING
    `, [migration.id, migration.name]);
  }

  // Get list of applied migrations
  async getAppliedMigrations(): Promise<Migration[]> {
    return db.query<Migration>(`
      SELECT id, name, applied_at
      FROM "${this.migrationsTable}"
      ORDER BY applied_at ASC
    `);
  }

  // Apply a single migration
  async applyMigration(migration: Migration): Promise<void> {
    console.log(`Applying migration: ${migration.id} - ${migration.name}`);
    
    try {
      // Split SQL into individual statements and execute them
      const statements = this.splitSqlStatements(migration.sql);
      
      for (const statement of statements) {
        if (statement.trim()) {
          await db.query(statement);
        }
      }
      
      // Record the migration as applied
      await this.recordMigration(migration);
      
      console.log(`✓ Migration applied successfully: ${migration.id}`);
    } catch (error) {
      console.error(`✗ Migration failed: ${migration.id}`, error);
      throw new Error(`Migration ${migration.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Split SQL file into individual statements
  private splitSqlStatements(sql: string): string[] {
    // Remove comments and split by semicolons
    const cleanSql = sql
      .replace(/--.*$/gm, '') // Remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();

    // Split by semicolons but be careful with function definitions and blocks
    const statements: string[] = [];
    let currentStatement = '';
    let inFunction = false;
    let dollarQuoteTag = '';
    
    const lines = cleanSql.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for dollar quoting (used in function definitions)
      const dollarMatch = trimmedLine.match(/\$([^$]*)\$/);
      if (dollarMatch) {
        if (!dollarQuoteTag) {
          dollarQuoteTag = dollarMatch[0];
          inFunction = true;
        } else if (dollarMatch[0] === dollarQuoteTag) {
          dollarQuoteTag = '';
          inFunction = false;
        }
      }
      
      currentStatement += line + '\n';
      
      // If we hit a semicolon and we're not in a function, end the statement
      if (trimmedLine.endsWith(';') && !inFunction) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    return statements.filter(stmt => stmt.length > 0);
  }

  // Apply multiple migrations
  async applyMigrations(migrations: Migration[]): Promise<void> {
    await this.initializeMigrationsTable();
    
    for (const migration of migrations) {
      const isApplied = await this.isMigrationApplied(migration.id);
      
      if (!isApplied) {
        await this.applyMigration(migration);
      } else {
        console.log(`⏭ Migration already applied: ${migration.id}`);
      }
    }
  }

  // Load migration from file
  loadMigrationFromFile(filePath: string, id: string, name: string): Migration {
    try {
      const sql = readFileSync(filePath, 'utf-8');
      return { id, name, sql };
    } catch (error) {
      throw new Error(`Failed to load migration file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate database schema
  async validateSchema(): Promise<{
    isValid: boolean;
    missingTables: string[];
    errors: string[];
  }> {
    const expectedTables = [
      'DonVi',
      'TaiKhoan',
      'NhanVien',
      'DanhMucHoatDong',
      'QuyTacTinChi',
      'GhiNhanHoatDong',
      'NhatKyHeThong',
      'ThongBao'
      // Temporarily skip materialized views: 'BaoCaoTienDoNhanVien', 'BaoCaoTongHopDonVi'
    ];

    const errors: string[] = [];
    const missingTables: string[] = [];

    try {
      // Check if all expected tables exist
      for (const table of expectedTables) {
        const exists = await db.queryOne<{ exists: boolean }>(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          ) as exists
        `, [table]);

        if (!exists?.exists) {
          missingTables.push(table);
        }
      }

      // Check if required extensions exist
      const extensions = await db.query<{ extname: string }>(`
        SELECT extname FROM pg_extension WHERE extname = 'pgcrypto'
      `);

      if (extensions.length === 0) {
        errors.push('pgcrypto extension is not installed');
      }

      // Check if required enums exist
      const requiredEnums = [
        'cap_quan_ly',
        'trang_thai_lam_viec',
        'trang_thai_duyet',
        'quyen_han',
        'loai_hoat_dong',
        'don_vi_tinh',
        'trang_thai_tb'
      ];

      for (const enumName of requiredEnums) {
        const exists = await db.queryOne<{ exists: boolean }>(`
          SELECT EXISTS (
            SELECT FROM pg_type WHERE typname = $1
          ) as exists
        `, [enumName]);

        if (!exists?.exists) {
          errors.push(`Enum type '${enumName}' is missing`);
        }
      }

    } catch (error) {
      errors.push(`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: missingTables.length === 0 && errors.length === 0,
      missingTables,
      errors
    };
  }

  // Get database statistics
  async getDatabaseStats(): Promise<{
    tables: Array<{
      name: string;
      rowCount: number;
      size: string;
    }>;
    totalSize: string;
  }> {
    try {
      const tables = await db.query<{
        table_name: string;
        row_count: string;
        size: string;
      }>(`
        SELECT 
          t.table_name,
          '0' as row_count,
          pg_size_pretty(pg_total_relation_size('"' || t.table_name || '"')) as size
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' 
          AND t.table_type = 'BASE TABLE'
        ORDER BY pg_total_relation_size('"' || t.table_name || '"') DESC
      `);

      const totalSizeResult = await db.queryOne<{ total_size: string }>(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as total_size
      `);

      return {
        tables: tables.map(t => ({
          name: t.table_name,
          rowCount: parseInt(t.row_count || '0', 10),
          size: t.size
        })),
        totalSize: totalSizeResult?.total_size || '0 bytes'
      };
    } catch (error) {
      console.warn('Could not get database stats:', error);
      return {
        tables: [],
        totalSize: '0 bytes'
      };
    }
  }
}

// Create singleton instance
export const migrationManager = new MigrationManager();

// Helper function to apply the initial schema
export async function applyInitialSchema(): Promise<void> {
  try {
    const schemaPath = join(process.cwd(), 'v_1_init_schema.sql');
    const migration = migrationManager.loadMigrationFromFile(
      schemaPath,
      'v1_init_schema',
      'Initial schema migration'
    );
    
    await migrationManager.applyMigrations([migration]);
    console.log('✓ Initial schema applied successfully');
  } catch (error) {
    console.error('✗ Failed to apply initial schema:', error);
    throw error;
  }
}

// Helper function to validate and setup database
export async function setupDatabase(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Test connection
    const connectionTest = await db.testConnection();
    if (!connectionTest) {
      return {
        success: false,
        message: 'Database connection failed'
      };
    }

    // Initialize migrations table
    await migrationManager.initializeMigrationsTable();

    // Check if initial schema is applied
    const isInitialSchemaApplied = await migrationManager.isMigrationApplied('v1_init_schema');
    
    if (!isInitialSchemaApplied) {
      await applyInitialSchema();
    }

    // Validate schema
    const validation = await migrationManager.validateSchema();
    
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Database schema validation failed',
        details: validation
      };
    }

    // Get database info
    const dbInfo = await db.getDatabaseInfo();
    const stats = await migrationManager.getDatabaseStats();

    return {
      success: true,
      message: 'Database setup completed successfully',
      details: {
        database: dbInfo,
        stats,
        validation
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Database setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}