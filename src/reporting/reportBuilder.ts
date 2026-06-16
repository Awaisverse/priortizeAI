import type {
  UnifiedDataPackage,
  PrioritizedActivities,
  IntelligenceBlocks,
  Report,
  ClassifiedActivity,
} from '../models';
import { generateId, nowISO, daysFromNow } from '../utils/helpers';
import { createLogger } from '../utils/logger';

const logger = createLogger('ReportBuilder');

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function priority_emoji(p: string): string {
  return p === 'P0' ? '🔴' : p === 'P1' ? '🟠' : p === 'P2' ? '🟡' : '⚪';
}

function buildExecutiveSummary(
  pkg: UnifiedDataPackage,
  prioritized: PrioritizedActivities,
  intelligence?: IntelligenceBlocks,
): string {
  const { byPriority, totalActivities } = prioritized.summary;
  const openDeals = pkg.deals.filter((d) => d.status === 'open');
  const pipeline = openDeals.reduce((s, d) => s + d.amount, 0);

  const lines: string[] = [
    '## Executive Summary',
    '',
  ];

  if (intelligence?.executiveSummary.summary) {
    lines.push(intelligence.executiveSummary.summary, '');
  }

  lines.push(
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Open Deals | ${openDeals.length} |`,
    `| Pipeline Value | ${fmt(pipeline)} |`,
    `| Total Activities | ${totalActivities} |`,
    `| Critical (P0) | ${byPriority.P0} |`,
    `| High Priority (P1) | ${byPriority.P1} |`,
    '',
  );

  if (intelligence?.executiveSummary.topPriorities.length) {
    lines.push('**Top Priorities:**');
    for (const p of intelligence.executiveSummary.topPriorities) {
      lines.push(`- ${p}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function buildP0Section(classified: ClassifiedActivity[], pkg: UnifiedDataPackage): string {
  const p0 = classified.filter((c) => c.priority === 'P0');
  if (p0.length === 0) return '';

  const lines = ['## 🔴 Critical Actions (P0)', ''];

  for (const item of p0) {
    lines.push(`### ${priority_emoji(item.priority)} ${item.rationale}`);
    lines.push(`**Type:** ${item.type} · **Category:** ${item.category}`);
    lines.push('');

    if (item.risks.length > 0) {
      lines.push('**Risks:**');
      item.risks.forEach((r) => lines.push(`- ⚠️ ${r}`));
      lines.push('');
    }

    if (item.recommendedActions.length > 0) {
      lines.push('**Actions:**');
      item.recommendedActions.forEach((a) =>
        lines.push(`- **${a.title}** _(${a.suggestedTiming ?? 'asap'})_: ${a.description}`),
      );
      lines.push('');
    }

    // Inline deal details if available
    if (item.type === 'deal') {
      const deal = pkg.deals.find((d) => d.id === item.sourceId);
      if (deal) {
        const daysLeft = daysFromNow(deal.closeDate);
        lines.push(`> ${fmt(deal.amount)} · Closes in ${daysLeft}d · Stage: ${deal.stage}`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

function buildMeetingPrepSection(
  pkg: UnifiedDataPackage,
  intelligence?: IntelligenceBlocks,
): string {
  const now = new Date();
  const todayMeetings = pkg.meetings.filter((m) => {
    const start = new Date(m.startTime);
    return (
      start.getFullYear() === now.getFullYear() &&
      start.getMonth() === now.getMonth() &&
      start.getDate() === now.getDate()
    );
  });

  if (todayMeetings.length === 0) return '';

  const lines = ['## 📅 Meeting Prep', ''];

  for (const meeting of todayMeetings) {
    const start = new Date(meeting.startTime);
    const timeStr = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    lines.push(`### ${meeting.title} — ${timeStr}`);
    lines.push(`**Duration:** ${meeting.durationMinutes}min · **Attendees:** ${meeting.attendees.map((a) => a.name ?? a.email).join(', ')}`);
    lines.push('');

    const insight = intelligence?.meetingInsights.find(
      (mi) => mi.meetingId === meeting.id || mi.title === meeting.title,
    );

    if (insight) {
      if (insight.prepNotes) lines.push(`**Prep Notes:** ${insight.prepNotes}`, '');
      if (insight.keyPointsToDiscuss.length > 0) {
        lines.push('**Key Points to Discuss:**');
        insight.keyPointsToDiscuss.forEach((p) => lines.push(`- ${p}`));
        lines.push('');
      }
      if (insight.questionsToAsk.length > 0) {
        lines.push('**Questions to Ask:**');
        insight.questionsToAsk.forEach((q) => lines.push(`- ${q}`));
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

function buildRiskSection(intelligence?: IntelligenceBlocks): string {
  if (!intelligence || intelligence.riskAnalysis.length === 0) return '';

  const lines = ['## ⚠️ Risk Alerts', ''];

  for (const risk of intelligence.riskAnalysis) {
    const icon = risk.severity === 'critical' ? '🔴' : risk.severity === 'high' ? '🟠' : '🟡';
    lines.push(`${icon} **[${risk.severity.toUpperCase()}]** ${risk.description}`);
    if (risk.affectedDeal) lines.push(`> Deal: ${risk.affectedDeal}`);
    if (risk.mitigationSteps.length > 0) {
      lines.push('Mitigation:');
      risk.mitigationSteps.forEach((s) => lines.push(`- ${s}`));
    }
    lines.push('');
  }

  return lines.join('\n');
}

function buildNextStepsSection(
  prioritized: PrioritizedActivities,
  intelligence?: IntelligenceBlocks,
): string {
  const steps = intelligence?.recommendedNextSteps ?? [];
  const actions = prioritized.recommendedActions;

  if (steps.length === 0 && actions.length === 0) return '';

  const lines = ['## ✅ Recommended Next Steps', ''];

  if (steps.length > 0) {
    steps.slice(0, 8).forEach((s, i) => {
      lines.push(
        `**${i + 1}. [${s.priority}] ${s.action}**`,
        `> ${s.rationale}`,
        `> _Expected: ${s.expectedOutcome}_ · ${s.suggestedTiming}`,
        '',
      );
    });
  } else {
    actions.slice(0, 8).forEach((a, i) => {
      lines.push(`**${i + 1}. ${a.title}** _(${a.suggestedTiming ?? 'asap'})_`);
      lines.push(a.description, '');
    });
  }

  return lines.join('\n');
}

function buildPipelineSummary(pkg: UnifiedDataPackage): string {
  const openDeals = pkg.deals
    .filter((d) => d.status === 'open' || d.status === 'needs_review')
    .sort((a, b) => b.amount - a.amount);

  if (openDeals.length === 0) return '';

  const lines = ['## 💼 Pipeline Summary', ''];
  lines.push('| Deal | Amount | Stage | Close Date | Risk |');
  lines.push('|------|--------|-------|------------|------|');

  for (const deal of openDeals.slice(0, 10)) {
    const closeIn = daysFromNow(deal.closeDate);
    const risk = deal.closingRisk ?? 'unknown';
    lines.push(
      `| ${deal.name} | ${fmt(deal.amount)} | ${deal.stage} | ${closeIn}d | ${risk} |`,
    );
  }

  lines.push('');
  return lines.join('\n');
}

export class ReportBuilder {
  build(
    aeId: string,
    executionId: string,
    pkg: UnifiedDataPackage,
    prioritized: PrioritizedActivities,
    intelligence?: IntelligenceBlocks,
  ): Report {
    logger.info('Building report', { aeId, executionId });

    const sections = {
      executiveSummary: buildExecutiveSummary(pkg, prioritized, intelligence),
      p0Priorities: buildP0Section(prioritized.classified, pkg),
      meetingPrep: buildMeetingPrepSection(pkg, intelligence),
      riskAlerts: buildRiskSection(intelligence),
      nextSteps: buildNextStepsSection(prioritized, intelligence),
      pipelineSummary: buildPipelineSummary(pkg),
    };

    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const markdown = [
      `# AE Daily Brief — ${dateStr}`,
      '',
      sections.executiveSummary,
      sections.p0Priorities,
      sections.meetingPrep,
      sections.riskAlerts,
      sections.nextSteps,
      sections.pipelineSummary,
    ]
      .filter(Boolean)
      .join('\n');

    const wordCount = markdown.split(/\s+/).length;

    const report: Report = {
      reportId: generateId(),
      executionId,
      aeId,
      generatedAt: nowISO(),
      markdown,
      sections: {
        executiveSummary: Boolean(sections.executiveSummary),
        p0Priorities: Boolean(sections.p0Priorities),
        meetingPrep: Boolean(sections.meetingPrep),
        riskAlerts: Boolean(sections.riskAlerts),
        nextSteps: Boolean(sections.nextSteps),
        pipelineSummary: Boolean(sections.pipelineSummary),
      },
      wordCount,
      deliveryStatus: 'pending',
    };

    logger.info('Report built', { aeId, reportId: report.reportId, wordCount });
    return report;
  }
}
