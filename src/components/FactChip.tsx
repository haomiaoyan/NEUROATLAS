import type { Fact } from '../data/sources';
import './fact-chip.css';

/** 数字条目卡：值 + 含义。出处统一在 Outro「参考资料」列出（B5 用户反馈：行内出处碍眼）。 */
export default function FactChip({ fact }: { fact: Fact }) {
  return (
    <span className={`fact-chip fact-chip--${fact.source.kind}`}>
      <span className="fact-chip__row">
        <strong className="fact-chip__value">{fact.value}</strong>
        <span className="fact-chip__label">{fact.label}</span>
      </span>
    </span>
  );
}
