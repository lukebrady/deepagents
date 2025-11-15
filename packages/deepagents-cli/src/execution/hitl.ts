/**
 * Human-in-the-Loop (HITL) workflow for tool approval.
 */

import chalk from 'chalk';
import { confirm } from '../input/prompt.js';

/**
 * Tool approval decision.
 */
export interface ApprovalDecision {
  approved: boolean;
  reason?: string;
}

/**
 * Tool call information.
 */
export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

/**
 * HITL manager for tool approval.
 */
export class HITLManager {
  private enabledTools: Set<string> = new Set();
  private disabledTools: Set<string> = new Set();
  private alwaysApprove = false;
  private alwaysDeny = false;

  /**
   * Request approval for a tool call.
   */
  async requestApproval(toolCall: ToolCall): Promise<ApprovalDecision> {
    // If always approve/deny is set, use that
    if (this.alwaysApprove) {
      return { approved: true };
    }
    if (this.alwaysDeny) {
      return { approved: false, reason: 'User denied all tool calls' };
    }

    // If tool is in enabled set, auto-approve
    if (this.enabledTools.has(toolCall.name)) {
      return { approved: true };
    }

    // If tool is in disabled set, auto-deny
    if (this.disabledTools.has(toolCall.name)) {
      return { approved: false, reason: `Tool ${toolCall.name} is disabled` };
    }

    // Show tool call details
    console.log(chalk.yellow('\n⚠️  Tool Call Approval Required'));
    console.log(chalk.cyan(`Tool: ${toolCall.name}`));
    console.log(chalk.gray('Arguments:'));
    console.log(chalk.gray(JSON.stringify(toolCall.args, null, 2)));
    console.log();

    // Ask for approval
    const approved = await confirm('Approve this tool call?', true);

    if (approved) {
      // Ask if always approve this tool
      const always = await confirm(`Always approve "${toolCall.name}"?`, false);
      if (always) {
        this.enabledTools.add(toolCall.name);
      }
      return { approved: true };
    } else {
      // Ask if always deny this tool
      const always = await confirm(`Always deny "${toolCall.name}"?`, false);
      if (always) {
        this.disabledTools.add(toolCall.name);
      }
      return { approved: false, reason: 'User denied tool call' };
    }
  }

  /**
   * Enable a tool (auto-approve).
   */
  enableTool(toolName: string): void {
    this.enabledTools.add(toolName);
    this.disabledTools.delete(toolName);
  }

  /**
   * Disable a tool (auto-deny).
   */
  disableTool(toolName: string): void {
    this.disabledTools.add(toolName);
    this.enabledTools.delete(toolName);
  }

  /**
   * Set always approve mode.
   */
  setAlwaysApprove(value: boolean): void {
    this.alwaysApprove = value;
    if (value) {
      this.alwaysDeny = false;
    }
  }

  /**
   * Set always deny mode.
   */
  setAlwaysDeny(value: boolean): void {
    this.alwaysDeny = value;
    if (value) {
      this.alwaysApprove = false;
    }
  }

  /**
   * Reset all approvals.
   */
  reset(): void {
    this.enabledTools.clear();
    this.disabledTools.clear();
    this.alwaysApprove = false;
    this.alwaysDeny = false;
  }

  /**
   * Get current approval settings.
   */
  getSettings(): {
    enabledTools: string[];
    disabledTools: string[];
    alwaysApprove: boolean;
    alwaysDeny: boolean;
  } {
    return {
      enabledTools: Array.from(this.enabledTools),
      disabledTools: Array.from(this.disabledTools),
      alwaysApprove: this.alwaysApprove,
      alwaysDeny: this.alwaysDeny,
    };
  }
}
