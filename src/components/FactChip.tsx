import type { Fact } from '../data/sources';
import CountUp from './CountUp';
import './fact-chip.css';

/** 数字条目卡：值 + 含义。出处统一在 Outro「参考资料」列出（B5 用户反馈：行内出处碍眼）。
    B7：带 count 配置的条目进视口滚动数字；data-fact 供验收脚本核对注册表覆盖。 */
export default function FactChip({ fact }: { fact: Fact }) {
  return (
    <span className={`fact-chip fact-chip--${fact.source.kind}`}>
      <span className="fact-chip__row">
        <strong className="fact-chip__value" data-fact={fact.id}>
          {fact.count ? (
            <CountUp value={fact.count.value} unit={fact.count.unit} prefix={fact.count.prefix} />
          ) : (
            fact.value
          )}
        </strong>
        <span className="fact-chip__label">{fact.label}</span>
      </span>
    </span>
  );
}
