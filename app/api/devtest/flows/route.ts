import { NextRequest, NextResponse } from 'next/server';
import { isDevtestEnabled, devtestResponse, devtestError } from '@/lib/devtest/core';

/**
 * Architecture Flow Verification
 * Compares planned architecture with actual test execution
 */

interface FlowNode {
  id: string;
  label: string;
  type: 'service' | 'database' | 'api' | 'gateway' | 'event';
  status?: 'success' | 'failure' | 'pending';
}

interface FlowConnection {
  from: string;
  to: string;
  label: string;
  status?: 'success' | 'failure' | 'pending';
}

interface ArchitectureFlow {
  name: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
}

/**
 * POST /api/devtest/flows
 * Submit and verify architecture flows
 * 
 * Body:
 * {
 *   action: 'register' | 'verify' | 'compare',
 *   flowName: string,
 *   flow: ArchitectureFlow,
 *   executionTrace?: any[] // Actual execution trace from test
 * }
 */
export async function POST(request: NextRequest) {
  if (!isDevtestEnabled()) {
    return devtestError('DEVTEST_DISABLED', 'Devtest is not enabled in this environment');
  }
  
  try {
    const body = await request.json();
    const { action, flowName, flow, executionTrace } = body;
    
    if (action === 'register') {
      if (!flowName || !flow) {
        return devtestError('INVALID_REQUEST', 'flowName and flow are required');
      }
      
      // Store the planned architecture flow
      const flowData = {
        name: flowName,
        registered: new Date(),
        flow,
      };
      
      return devtestResponse({
        success: true,
        message: `Flow registered: ${flowName}`,
        flow: flowData,
      });
    }
    
    else if (action === 'verify') {
      if (!flowName || !executionTrace) {
        return devtestError('INVALID_REQUEST', 'flowName and executionTrace are required');
      }
      
      // Verify execution matches planned flow
      const verification = verifyFlowExecution(flow, executionTrace);
      
      return devtestResponse({
        success: verification.passed,
        flowName,
        verification,
      });
    }
    
    else if (action === 'compare') {
      if (!flowName || !flow || !executionTrace) {
        return devtestError(
          'INVALID_REQUEST',
          'flowName, flow, and executionTrace are required'
        );
      }
      
      const comparison = compareFlows(flow, executionTrace);
      
      return devtestResponse({
        success: comparison.allNodesMatch && comparison.allConnectionsMatch,
        flowName,
        comparison,
      });
    }
    
    else {
      return devtestError('INVALID_REQUEST', 'Invalid action: ' + action);
    }
  } catch (error: any) {
    console.error('Flow verification error:', error);
    return devtestError('FLOW_VERIFICATION_ERROR', error.message);
  }
}

/**
 * GET /api/devtest/flows
 * Get registered flows and their verification status
 * 
 * Query params:
 * - flowName?: string  // Get specific flow
 * - status?: string    // Filter by status (verified, mismatch, pending)
 */
export async function GET(request: NextRequest) {
  if (!isDevtestEnabled()) {
    return devtestError('DEVTEST_DISABLED', 'Devtest is not enabled in this environment');
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const flowName = searchParams.get('flowName');
    const status = searchParams.get('status');
    
    // Get predefined flows
    const flows = getPredefinedFlows();
    
    let result = flows;
    
    if (flowName) {
      result = flows.filter(f => f.name === flowName);
    }
    
    if (status) {
      // Filter by verification status
      // In real implementation, would check against stored verification results
    }
    
    return devtestResponse({
      success: true,
      count: result.length,
      flows: result,
    });
  } catch (error: any) {
    console.error('Flow retrieval error:', error);
    return devtestError('FLOW_RETRIEVAL_ERROR', error.message);
  }
}

/**
 * Get predefined architecture flows
 */
function getPredefinedFlows(): ArchitectureFlow[] {
  return [
    {
      name: 'Order Creation Flow',
      nodes: [
        { id: 'api_create', label: 'POST /api/orders', type: 'api' },
        { id: 'svc_validate', label: 'Validate Order Data', type: 'service' },
        { id: 'db_order', label: 'Save Order', type: 'database' },
        { id: 'svc_inventory', label: 'Allocate Inventory', type: 'service' },
        { id: 'db_inventory', label: 'Update Inventory', type: 'database' },
        { id: 'evt_created', label: 'Order.Created Event', type: 'event' },
      ],
      connections: [
        {
          from: 'api_create',
          to: 'svc_validate',
          label: 'Validate',
        },
        {
          from: 'svc_validate',
          to: 'db_order',
          label: 'Save',
        },
        {
          from: 'db_order',
          to: 'svc_inventory',
          label: 'Allocate',
        },
        {
          from: 'svc_inventory',
          to: 'db_inventory',
          label: 'Update',
        },
        {
          from: 'db_inventory',
          to: 'evt_created',
          label: 'Emit',
        },
      ],
    },
    {
      name: 'Payment Processing Flow',
      nodes: [
        { id: 'api_init', label: 'POST /api/payments/initiate', type: 'api' },
        { id: 'svc_payment', label: 'Payment Service', type: 'service' },
        { id: 'gateway', label: 'Payment Gateway (Razorpay/Stripe)', type: 'gateway' },
        { id: 'db_payment', label: 'Save Payment', type: 'database' },
        { id: 'webhook', label: 'Webhook Handler', type: 'api' },
        { id: 'svc_confirm', label: 'Confirm Payment', type: 'service' },
        { id: 'evt_paid', label: 'Order.Paid Event', type: 'event' },
      ],
      connections: [
        {
          from: 'api_init',
          to: 'svc_payment',
          label: 'Initiate',
        },
        {
          from: 'svc_payment',
          to: 'gateway',
          label: 'Create Payment',
        },
        {
          from: 'gateway',
          to: 'db_payment',
          label: 'Redirect',
        },
        {
          from: 'db_payment',
          to: 'webhook',
          label: 'Store',
        },
        {
          from: 'webhook',
          to: 'svc_confirm',
          label: 'Verify Signature',
        },
        {
          from: 'svc_confirm',
          to: 'evt_paid',
          label: 'Emit',
        },
      ],
    },
    {
      name: 'Refund Flow',
      nodes: [
        { id: 'api_refund', label: 'POST /api/payments/refund', type: 'api' },
        { id: 'svc_refund', label: 'Refund Service', type: 'service' },
        { id: 'gateway_refund', label: 'Gateway Refund', type: 'gateway' },
        { id: 'db_refund', label: 'Save Refund', type: 'database' },
        { id: 'db_order_refund', label: 'Update Order Status', type: 'database' },
        { id: 'evt_refund', label: 'Order.Refunded Event', type: 'event' },
      ],
      connections: [
        {
          from: 'api_refund',
          to: 'svc_refund',
          label: 'Initiate',
        },
        {
          from: 'svc_refund',
          to: 'gateway_refund',
          label: 'Process',
        },
        {
          from: 'gateway_refund',
          to: 'db_refund',
          label: 'Confirm',
        },
        {
          from: 'db_refund',
          to: 'db_order_refund',
          label: 'Update',
        },
        {
          from: 'db_order_refund',
          to: 'evt_refund',
          label: 'Emit',
        },
      ],
    },
  ];
}

/**
 * Verify that execution trace follows planned flow
 */
function verifyFlowExecution(
  plannedFlow: ArchitectureFlow,
  executionTrace: any[]
): {
  passed: boolean;
  visitedNodes: string[];
  missingNodes: string[];
  unexpectedNodes: string[];
  errors: string[];
} {
  const plannedNodeIds = plannedFlow.nodes.map(n => n.id);
  const visitedNodes: string[] = [];
  const errors: string[] = [];
  
  // Extract node IDs from execution trace
  for (const step of executionTrace) {
    if (step.nodeId) {
      visitedNodes.push(step.nodeId);
      
      // Verify node exists in planned flow
      if (!plannedNodeIds.includes(step.nodeId)) {
        errors.push(`Unexpected node in execution: ${step.nodeId}`);
      }
      
      // Check for errors at this step
      if (step.error) {
        errors.push(`Error at ${step.nodeId}: ${step.error}`);
      }
    }
  }
  
  const missingNodes = plannedNodeIds.filter(id => !visitedNodes.includes(id));
  
  return {
    passed: missingNodes.length === 0 && errors.length === 0,
    visitedNodes,
    missingNodes,
    unexpectedNodes: visitedNodes.filter(id => !plannedNodeIds.includes(id)),
    errors,
  };
}

/**
 * Compare planned flow with execution trace (detailed)
 */
function compareFlows(
  plannedFlow: ArchitectureFlow,
  executionTrace: any[]
): {
  allNodesMatch: boolean;
  allConnectionsMatch: boolean;
  nodeComparisons: Array<{
    nodeId: string;
    planned: boolean;
    executed: boolean;
    status?: string;
  }>;
  connectionComparisons: Array<{
    connection: string;
    planned: boolean;
    executed: boolean;
  }>;
} {
  const plannedNodeIds = plannedFlow.nodes.map(n => n.id);
  const executedNodeIds = executionTrace.map((step: any) => step.nodeId).filter(Boolean);
  
  const nodeComparisons = plannedFlow.nodes.map(node => ({
    nodeId: node.id,
    planned: true,
    executed: executedNodeIds.includes(node.id),
    status: node.status,
  }));
  
  // Add executed nodes that weren't planned
  for (const nodeId of executedNodeIds) {
    if (!plannedNodeIds.includes(nodeId)) {
      nodeComparisons.push({
        nodeId,
        planned: false,
        executed: true,
      });
    }
  }
  
  const allNodesMatch = nodeComparisons.every(
    nc => nc.planned && nc.executed
  );
  
  // Compare connections by checking node sequence
  const executionSequence = executedNodeIds;
  const plannedSequence = plannedFlow.nodes.map(n => n.id);
  
  const connectionComparisons = plannedFlow.connections.map(conn => ({
    connection: `${conn.from} -> ${conn.to}`,
    planned: true,
    executed:
      executionSequence.includes(conn.from) &&
      executionSequence.includes(conn.to) &&
      executionSequence.indexOf(conn.from) < executionSequence.indexOf(conn.to),
  }));
  
  const allConnectionsMatch = connectionComparisons.every(
    cc => cc.planned && cc.executed
  );
  
  return {
    allNodesMatch,
    allConnectionsMatch,
    nodeComparisons,
    connectionComparisons,
  };
}
