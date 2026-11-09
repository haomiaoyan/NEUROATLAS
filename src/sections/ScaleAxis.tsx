import { getFact } from '../data/sources';
import './chapters.css';
import './scale-axis.css';

const NODES = [
  {
    id: 'action-potential-duration',
    title: '一次动作电位',
    text: '钠通道打开、电位反转、再复极化——整场戏在毫秒级演完。',
    href: '#signal',
    link: '去看第 01 章',
  },
  {
    id: 'thought-duration',
    title: '一个念头',
    text: '一次识别、一次判断，快到十分之一秒级；这时成群的神经元已协同起来。',
    href: '#map',
    link: '去看第 03 章',
  },
  {
    id: 'memory-consolidation',
    title: '记忆转写',
    text: '睡眠中海马体把白天的片段重放、打包，转交给皮层。',
    href: '#memory',
    link: '去看第 04 章',
  },
  {
    id: 'memory-lifetime',
    title: '长期档案',
    text: '写进皮层连接强度的信息，可以陪你走完一生。',
    href: '#memory',
    link: '去看第 04 章',
  },
];

/** SCALE · 尺度轴（B7 新章，用户确认：CH01 之前做总览、静态时间轴卡片）。 */
export default function ScaleAxis() {
  return (
    <section className="chapter scale" id="scale">
      <div className="chapter__inner">
        <header className="chapter__head reveal">
          <p className="chapter__kicker">SCALE · 尺度轴</p>
          <h2 className="chapter__title">从一毫秒到一生</h2>
          <p className="chapter__body">
            同一套神经系统，在不同时间尺度上做的事完全不同。先看清这张地图，再钻进细节。
          </p>
        </header>
        <ol className="scale__list reveal">
          {NODES.map((n) => {
            const f = getFact(n.id);
            return (
              <li className="scale__node" key={n.id}>
                <span className="scale__dot" aria-hidden="true" />
                <p className="scale__time" data-fact={f.id}>
                  {f.value}
                </p>
                <h3 className="scale__title">{n.title}</h3>
                <p className="scale__text">{n.text}</p>
                <a className="scale__link" href={n.href}>
                  {n.link} →
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
