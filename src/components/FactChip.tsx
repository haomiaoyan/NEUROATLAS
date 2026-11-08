import type { Fact } from '../data/sources';
import './fact-chip.css';

/** 数字条目卡（D7）：文献值蓝边 / 教学示意橙边，来源自动渲染。 */
export default function FactChip({ fact }: { fact: Fact }) {
  return (
    <span className={`fact-chip fact-chip--${fact.source.kind}`}>
      <span className="fact-chip__row">
        <strong className="fact-chip__value">{fact.value}</strong>
        <span className="fact-chip__label">{fact.label}</span>
      </span>
      <span className="fact-chip__source">
        {fact.source.kind === 'illustrative'
          ? `教学示意 · ${fact.source.name}`
          : `${fact.source.name}${fact.source.year ? `，${fact.source.year}` : ''}`}
      </span>
    </span>
  );
}
