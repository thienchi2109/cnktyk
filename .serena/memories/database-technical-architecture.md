# Database Architecture & Technical Details

## Database Connection Architecture
- **Driver**: @neondatabase/serverless for Cloudflare Workers compatibility
- **Connection Pattern**: Lazy initialization with connection caching
- **Error Handling**: Comprehensive error wrapping and logging
- **Health Monitoring**: Automated connection health checks with latency tracking

## Schema Design Principles
- **Type Safety**: Zod schemas provide runtime validation + TypeScript types
- **Business Rules**: Validation includes domain-specific constraints
- **Referential Integrity**: Foreign key relationships properly maintained
- **Audit Trail**: All modifications tracked in NhatKyHeThong table

## Repository Pattern Implementation
- **Base Repository**: Generic CRUD operations with type safety
- **Specialized Repositories**: Business logic for each entity type
- **Query Optimization**: Efficient queries with proper indexing
- **Transaction Support**: Sequential operations for data consistency

## Key Technical Decisions
1. **Raw SQL over ORM**: Better performance and control for complex queries
2. **Repository Pattern**: Clean separation of data access and business logic  
3. **Zod Validation**: Runtime type safety with excellent error messages
4. **Lazy Loading**: Connections initialized only when needed
5. **Comprehensive Testing**: Multiple test levels ensure reliability

## Security Measures
- **Password Hashing**: bcrypt with salt rounds for user authentication
- **SQL Injection Prevention**: Parameterized queries throughout
- **Audit Logging**: All database operations tracked with user context
- **Input Validation**: Zod schemas validate all data before database operations

## Performance Optimizations
- **Connection Pooling**: Neon serverless handles connection management
- **Query Optimization**: Efficient queries with proper WHERE clauses
- **Pagination Support**: Built-in pagination for large result sets
- **Index Usage**: Leverages existing database indexes from schema

## Testing Strategy
- **Unit Tests**: Individual repository methods tested
- **Integration Tests**: Full workflow testing with cleanup
- **Performance Tests**: Connection and query performance verified
- **Data Integrity Tests**: Foreign key constraints and relationships validated

## Compliance Features
- **Audit Trail**: Complete history of all data modifications
- **Data Validation**: Business rules enforced at database level
- **User Tracking**: All operations linked to authenticated users
- **Compliance Calculations**: Automated credit tracking and progress monitoring