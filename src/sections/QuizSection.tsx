import { useState } from 'react';
import './quiz.css';

interface Question {
  question: string;
  options: string[];
  answer: number;
  feedback: string;
  chapter: string;
  chapterLabel: string;
}

/** 答案全部来自站内已讲内容，不引入新知识点。 */
const QUESTIONS: Question[] = [
  {
    question: '刺激没有越过 −55 mV 阈值，神经元会怎样？',
    options: ['微弱地发放一点', '完全不发放', '延迟一会儿再发放'],
    answer: 1,
    feedback: '「全有全无」：不够就完全沉默，够了才全力开火。',
    chapter: '#signal',
    chapterLabel: '第 01 章 · 信号跑道',
  },
  {
    question: '海马体受损后，最可能出现哪种情况？',
    options: ['旧记忆全部消失', '无法形成新的长期记忆', '短期记忆立刻消失'],
    answer: 1,
    feedback: 'H.M. 的手术（1953）证明海马体是「转写员」，不是记忆仓库本身。',
    chapter: '#memory',
    chapterLabel: '第 04 章 · 记忆',
  },
  {
    question: '大脑约 2% 重量却消耗全身约 20% 能量，主要说明什么？',
    options: ['大脑工作效率很低', '维持与传递神经信号的代价很高', '这个数据有误'],
    answer: 1,
    feedback: '静息电位的维护与突触传递都在持续耗能；数据出自 Raichle & Gusnard, 2002。',
    chapter: '#map',
    chapterLabel: '第 03 章 · 大脑地图',
  },
];

/** B8 文末小测（用户确认的完整版）：不记分、不上传、不存储，选完立刻给解释。 */
export default function QuizSection() {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const q = QUESTIONS[idx];
  const correct = selected !== null && selected === q.answer;

  const next = () => {
    if (idx < QUESTIONS.length - 1) {
      setIdx(idx + 1);
      setSelected(null);
    } else {
      setDone(true);
    }
  };
  const restart = () => {
    setIdx(0);
    setSelected(null);
    setDone(false);
  };

  return (
    <section className="quiz" id="quiz" aria-label="检验一下：三道小题">
      <div className="quiz__inner">
        <header className="quiz__head">
          <p className="quiz__kicker">CHECK YOURSELF</p>
          <h2 className="quiz__title">检验一下</h2>
          <p className="quiz__intro">三道题，答案都在前面的章节里。不记分、不上传，选完立刻给解释。</p>
        </header>

        {done ? (
          <div className="quiz__done" data-quiz-done>
            <p className="quiz__done-title">3 / 3，走完这段神经漫游</p>
            <p className="quiz__done-text">想再看一遍？答案还在原来的章节里。</p>
            <button className="quiz__btn" onClick={restart}>
              再做一次
            </button>
          </div>
        ) : (
          <div className="quiz__card">
            <div className="quiz__meta">
              <span>第 {idx + 1} / {QUESTIONS.length} 题</span>
              <span>不记分 · 刷新即重置</span>
            </div>
            <h3 className="quiz__q">{q.question}</h3>
            <div className="quiz__options">
              {q.options.map((opt, i) => (
                <button
                  key={opt}
                  className={[
                    'quiz__option',
                    selected !== null && i === q.answer ? 'quiz__option--right' : '',
                    selected === i && i !== q.answer ? 'quiz__option--wrong' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setSelected(i)}
                  aria-pressed={selected === i}
                >
                  {opt}
                </button>
              ))}
            </div>
            {selected !== null && (
              <div
                className="quiz__feedback"
                role="status"
                aria-live="polite"
                data-quiz-feedback={correct ? 'correct' : 'wrong'}
              >
                <strong className={correct ? 'quiz__ok' : 'quiz__no'}>{correct ? '答对了' : '再想想'}</strong>
                <span> · {q.feedback}</span>
                <a className="quiz__chapter" href={q.chapter}>
                  {q.chapterLabel} →
                </a>
              </div>
            )}
            <div className="quiz__footer">
              <span className="quiz__hint">选一个答案，立刻看解释</span>
              <button className="quiz__btn" onClick={next} disabled={selected === null}>
                {idx < QUESTIONS.length - 1 ? '下一题' : '完成'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
