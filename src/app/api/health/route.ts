import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Health check endpoint called');
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Server is running'
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}