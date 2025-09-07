import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing basic database connection...');
    
    // Test 1: Simple connection test
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Test 2: Simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Raw query result:', result);
    
    // Test 3: Count tasks
    const taskCount = await prisma.task.count();
    console.log('Task count:', taskCount);
    
    return NextResponse.json({
      status: 'success',
      message: 'Database connection working',
      taskCount: Number(taskCount),
      rawQueryResult: result.map(row => ({
        ...row,
        test: Number(row.test)
      }))
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}