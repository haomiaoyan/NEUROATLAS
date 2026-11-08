import SocialLinks from '../components/SocialLinks';
import { FACTS } from '../data/sources';
import './outro.css';

/** Outro（B5）：边界声明（D7，显眼位置）+ 全部出处汇总 + 社交入口。 */
export default function Outro() {
  return (
    <footer className="outro" id="outro">
      <div className="outro__inner">
        <p className="outro__kicker">EPILOGUE</p>
        <h2 className="outro__title">关于这个网站</h2>
        <div className="outro__cols">
          <div className="outro__col">
            <h3>它是什么</h3>
            <p>
              一份前端课程的教学演示作品：用可交互的可视化讲解神经信号的基础知识。
              所有图形均为示意，不追求科研级精确；每个数字旁都标了出处或「教学示意」。
            </p>
          </div>
          <div className="outro__col">
            <h3>它不是什么</h3>
            <p>
              不是医疗建议，不是真实临床数据或药物研发的复现，也不对内容在课堂之外的
              使用方式负责。健康相关问题请咨询专业医生。
            </p>
          </div>
        </div>

        <details className="outro__sources">
          <summary>全部数据出处（{FACTS.length} 条）</summary>
          <ul>
            {FACTS.map((f) => (
              <li key={f.id}>
                <strong>{f.value}</strong> — {f.label}。
                {f.source.kind === 'illustrative' ? '教学示意：' : ''}
                {f.source.name}
                {f.source.year ? `，${f.source.year}` : ''}。
              </li>
            ))}
          </ul>
        </details>

        <div className="outro__social">
          <SocialLinks />
        </div>
        <p className="outro__fin">NEUROATLAS · 860 亿个神经元，一起读到了页脚</p>
      </div>
    </footer>
  );
}
