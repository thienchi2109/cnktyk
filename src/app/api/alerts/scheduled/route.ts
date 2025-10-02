import { NextRequest, NextResponse } from 'next/server';
import { generateComplianceAlerts, generateDeadlineReminders } from '@/lib/db/utils';

// POST /api/alerts/scheduled - Run scheduled alert generation (for cron jobs)
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate scheduled request
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskType } = body;

    let result;

    switch (taskType) {
      case 'compliance_check':
        result = await generateComplianceAlerts();
        break;
      
      case 'deadline_reminders':
        result = await generateDeadlineReminders(30); // 30 days before deadline
        break;
      
      case 'weekly_summary':
        // Generate weekly compliance summary
        const complianceResult = await generateComplianceAlerts();
        const deadlineResult = await generateDeadlineReminders(7); // 7 days for weekly check
        
        result = {
          success: complianceResult.success && deadlineResult.success,
          alertCount: complianceResult.alertCount + deadlineResult.alertCount,
          errors: [...complianceResult.errors, ...deadlineResult.errors]
        };
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid task type' }, { status: 400 });
    }

    return NextResponse.json({
      success: result.success,
      message: `Scheduled task '${taskType}' completed`,
      alertCount: result.alertCount,
      errors: result.errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error running scheduled alerts:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run scheduled alerts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/alerts/scheduled - Get scheduled task status (for monitoring)
export async function GET(request: NextRequest) {
  try {
    // This would typically return the status of scheduled tasks
    // For now, return a simple health check
    
    return NextResponse.json({
      status: 'healthy',
      scheduledTasks: [
        {
          name: 'compliance_check',
          description: 'Daily compliance alert generation',
          schedule: '0 9 * * *', // 9 AM daily
          lastRun: null,
          nextRun: null
        },
        {
          name: 'deadline_reminders',
          description: 'Weekly deadline reminders',
          schedule: '0 9 * * 1', // 9 AM every Monday
          lastRun: null,
          nextRun: null
        },
        {
          name: 'weekly_summary',
          description: 'Weekly compliance summary',
          schedule: '0 18 * * 5', // 6 PM every Friday
          lastRun: null,
          nextRun: null
        }
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting scheduled task status:', error);
    return NextResponse.json(
      { error: 'Failed to get task status' },
      { status: 500 }
    );
  }
}