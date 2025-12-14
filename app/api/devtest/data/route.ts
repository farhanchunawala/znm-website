import { NextRequest, NextResponse } from 'next/server';
import TestDataManager from '@/lib/devtest/dataManager';
import { isDevtestEnabled, devtestResponse, devtestError } from '@/lib/devtest/core';

/**
 * GET /api/devtest/data
 * Get current test data state
 * 
 * Query params:
 * - model?: string  // Get data for specific model (User, Product, Order, etc)
 * - id?: string     // Get specific document
 */
export async function GET(request: NextRequest) {
  if (!isDevtestEnabled()) {
    return devtestError('DEVTEST_DISABLED', 'Devtest is not enabled in this environment');
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    const id = searchParams.get('id');
    
    if (model && id) {
      const doc = await TestDataManager.getTestDocument(model, id);
      return devtestResponse({
        success: !!doc,
        data: doc,
      });
    } else {
      const summary = await TestDataManager.getStateSummary();
      return devtestResponse({
        success: true,
        summary,
      });
    }
  } catch (error: any) {
    console.error('Data retrieval error:', error);
    return devtestError('DATA_RETRIEVAL_ERROR', error.message);
  }
}

/**
 * POST /api/devtest/data
 * Create or seed test data
 * 
 * Body:
 * {
 *   action: 'initialize' | 'seed' | 'create',
 *   model?: string,
 *   data?: Record<string, any>,
 *   seed?: TestDataSeed
 * }
 */
export async function POST(request: NextRequest) {
  if (!isDevtestEnabled()) {
    return devtestError('DEVTEST_DISABLED', 'Devtest is not enabled in this environment');
  }
  
  try {
    const body = await request.json();
    const { action, model, data, seed } = body;
    
    if (action === 'initialize') {
      await TestDataManager.initializeTestData();
      const summary = await TestDataManager.getStateSummary();
      return devtestResponse({
        success: true,
        message: 'Test data initialized',
        summary,
      });
    } else if (action === 'seed') {
      const created = await TestDataManager.seedData(seed);
      const summary = await TestDataManager.getStateSummary();
      return devtestResponse({
        success: true,
        message: 'Test data seeded',
        created,
        summary,
      });
    } else if (action === 'create') {
      if (!model || !data) {
        return devtestError('INVALID_REQUEST', 'model and data are required');
      }
      const doc = await TestDataManager.createTestDocument(model, data);
      return devtestResponse({
        success: true,
        message: `Created ${model}`,
        document: doc,
      });
    } else {
      return devtestError('INVALID_REQUEST', 'Invalid action: ' + action);
    }
  } catch (error: any) {
    console.error('Data creation error:', error);
    return devtestError('DATA_CREATION_ERROR', error.message);
  }
}

/**
 * PUT /api/devtest/data
 * Update test data
 * 
 * Body:
 * {
 *   model: string,
 *   id: string,
 *   data: Record<string, any>
 * }
 */
export async function PUT(request: NextRequest) {
  if (!isDevtestEnabled()) {
    return devtestError('DEVTEST_DISABLED', 'Devtest is not enabled in this environment');
  }
  
  try {
    const body = await request.json();
    const { model, id, data } = body;
    
    if (!model || !id || !data) {
      return devtestError('INVALID_REQUEST', 'model, id, and data are required');
    }
    
    const before = await TestDataManager.getTestDataSnapshot(model, id);
    const updated = await TestDataManager.updateTestDocument(model, id, data);
    const after = await TestDataManager.getTestDataSnapshot(model, id);
    const changes = TestDataManager.compareSnapshots(before, after);
    
    return devtestResponse({
      success: true,
      message: `Updated ${model}`,
      document: updated,
      changes,
    });
  } catch (error: any) {
    console.error('Data update error:', error);
    return devtestError('DATA_UPDATE_ERROR', error.message);
  }
}

/**
 * DELETE /api/devtest/data
 * Delete test data
 * 
 * Query params:
 * - model: string   // Model name
 * - id: string      // Document ID
 * - action?: string // 'cleanup' (delete), 'reset' (reset to baseline)
 */
export async function DELETE(request: NextRequest) {
  if (!isDevtestEnabled()) {
    return devtestError('DEVTEST_DISABLED', 'Devtest is not enabled in this environment');
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    const id = searchParams.get('id');
    const action = searchParams.get('action');
    
    if (action === 'reset') {
      await TestDataManager.resetToBaseline();
      const summary = await TestDataManager.getStateSummary();
      return devtestResponse({
        success: true,
        message: 'Test data reset to baseline',
        summary,
      });
    } else if (model && id) {
      await TestDataManager.cleanupTestData(model, id);
      return devtestResponse({
        success: true,
        message: `Deleted ${model} ${id}`,
      });
    } else if (!model && !id) {
      await TestDataManager.clearAllTestData();
      return devtestResponse({
        success: true,
        message: 'Cleared all test data',
      });
    } else {
      return devtestError('INVALID_REQUEST', 'Provide model+id or action=reset');
    }
  } catch (error: any) {
    console.error('Data deletion error:', error);
    return devtestError('DATA_DELETION_ERROR', error.message);
  }
}
