// Example usage of the database utilities in Next.js API routes

import { dbUtils, initializeDatabase } from './index';

// Example: Health check API route
export async function handleHealthCheck() {
  try {
    const health = await dbUtils.health();
    return {
      status: 200,
      data: health
    };
  } catch (error) {
    return {
      status: 500,
      error: 'Health check failed'
    };
  }
}

// Example: Authentication API route
export async function handleLogin(username: string, password: string) {
  try {
    const result = await dbUtils.auth(username, password);
    
    if (!result.success) {
      return {
        status: 401,
        error: result.message
      };
    }

    return {
      status: 200,
      data: {
        user: result.user,
        message: 'Login successful'
      }
    };
  } catch (error) {
    return {
      status: 500,
      error: 'Authentication failed'
    };
  }
}

// Example: Practitioner dashboard API route
export async function handlePractitionerDashboard(practitionerId: string) {
  try {
    const dashboardData = await dbUtils.dashboard.practitioner(practitionerId);
    
    return {
      status: 200,
      data: dashboardData
    };
  } catch (error) {
    return {
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to load dashboard'
    };
  }
}

// Example: Unit dashboard API route
export async function handleUnitDashboard(unitId: string) {
  try {
    const dashboardData = await dbUtils.dashboard.unit(unitId);
    
    return {
      status: 200,
      data: dashboardData
    };
  } catch (error) {
    return {
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to load unit dashboard'
    };
  }
}

// Example: Activity submission API route
export async function handleActivitySubmission(
  activityData: any,
  submitterId: string,
  ipAddress?: string
) {
  try {
    const result = await dbUtils.activities.submit(activityData, submitterId);
    
    if (!result.success) {
      return {
        status: 400,
        error: result.message
      };
    }

    // Log the submission
    if (result.activity) {
      await dbUtils.audit(
        submitterId,
        'SUBMIT_ACTIVITY',
        'GhiNhanHoatDong',
        result.activity.MaGhiNhan,
        { activityName: result.activity.TenHoatDong },
        ipAddress
      );
    }

    return {
      status: 201,
      data: {
        activity: result.activity,
        message: 'Activity submitted successfully'
      }
    };
  } catch (error) {
    return {
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to submit activity'
    };
  }
}

// Example: Search practitioners API route
export async function handleSearchPractitioners(
  searchTerm: string,
  filters: any = {}
) {
  try {
    const practitioners = await dbUtils.search.practitioners(searchTerm, filters);
    
    return {
      status: 200,
      data: {
        practitioners,
        count: practitioners.length
      }
    };
  } catch (error) {
    return {
      status: 500,
      error: error instanceof Error ? error.message : 'Search failed'
    };
  }
}

// Example: Database initialization (for setup scripts)
export async function handleDatabaseSetup() {
  try {
    const result = await initializeDatabase();
    
    return {
      status: 200,
      data: {
        message: 'Database initialized successfully',
        details: result.details
      }
    };
  } catch (error) {
    return {
      status: 500,
      error: error instanceof Error ? error.message : 'Database setup failed'
    };
  }
}

// Example middleware for request logging
export async function logRequest(
  userId: string | null,
  method: string,
  path: string,
  ipAddress?: string
) {
  if (userId) {
    await dbUtils.audit(
      userId,
      'API_REQUEST',
      'system',
      path,
      { method, path },
      ipAddress
    );
  }
}

// Example: Error handling wrapper
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | { status: 500; error: string }> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('API Error:', error);
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Internal server error'
      };
    }
  };
}

// Export wrapped handlers
export const apiHandlers = {
  healthCheck: withErrorHandling(handleHealthCheck),
  login: withErrorHandling(handleLogin),
  practitionerDashboard: withErrorHandling(handlePractitionerDashboard),
  unitDashboard: withErrorHandling(handleUnitDashboard),
  submitActivity: withErrorHandling(handleActivitySubmission),
  searchPractitioners: withErrorHandling(handleSearchPractitioners),
  setupDatabase: withErrorHandling(handleDatabaseSetup)
};