import { Injectable } from '@nestjs/common';
import { AnalyzeContentDto } from './dto/auto-moderation.dto';
import { ModerationService } from './moderation.service';

export interface ModerationRuleResult {
  isSafe: boolean;
  toxicityScore: number; // 0 to 100
  flaggedCategories: string[];
  recommendedAction: 'ALLOW' | 'FLAG_FOR_REVIEW' | 'AUTO_MUTE_USER' | 'AUTO_KICK_USER';
  explanation: string;
}

@Injectable()
export class AutoModerationService {
  private readonly BLOCKED_PATTERNS = [
    { pattern: /\b(scam|phishing|free-coins-click-here|claim-diamonds-now)\b/i, category: 'SPAM_PHISHING', score: 90 },
    { pattern: /\b(hate|slur|abuse|harass)\b/i, category: 'HATE_SPEECH', score: 85 },
    { pattern: /\b(telegram\.me|t\.me|whatsapp\.com\/chat)\b/i, category: 'EXTERNAL_PROMOTION', score: 60 },
  ];

  constructor(private readonly moderationService: ModerationService) {}

  analyzeContent(dto: AnalyzeContentDto): ModerationRuleResult {
    const { text } = dto;
    const flaggedCategories: string[] = [];
    let totalScore = 0;

    for (const rule of this.BLOCKED_PATTERNS) {
      if (rule.pattern.test(text)) {
        flaggedCategories.push(rule.category);
        totalScore = Math.max(totalScore, rule.score);
      }
    }

    let recommendedAction: ModerationRuleResult['recommendedAction'] = 'ALLOW';
    let explanation = 'Content verified clean and compliant.';

    if (totalScore >= 85) {
      recommendedAction = 'AUTO_KICK_USER';
      explanation = `High risk toxicity detected (${flaggedCategories.join(', ')}). Immediate kick required.`;
    } else if (totalScore >= 60) {
      recommendedAction = 'AUTO_MUTE_USER';
      explanation = `Moderate violation detected (${flaggedCategories.join(', ')}). Recommended temporary auto-mute.`;
    } else if (totalScore > 0) {
      recommendedAction = 'FLAG_FOR_REVIEW';
      explanation = `Potential minor violation flagged (${flaggedCategories.join(', ')}). Sent to moderator queue.`;
    }

    return {
      isSafe: totalScore < 60,
      toxicityScore: totalScore,
      flaggedCategories,
      recommendedAction,
      explanation,
    };
  }
}
