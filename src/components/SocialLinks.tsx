import './social-links.css';

/** 社交图标（uiverse example-2 改造，D5）：tooltip + 底色上升填充。
    硬编码色 → CSS 变量；两个入口：GitHub 仓库 / 意见反馈邮箱。 */
export default function SocialLinks() {
  return (
    <ul className="social">
      <li className="social__item">
        <span className="social__tooltip">源码仓库</span>
        <a
          className="social__link"
          href="https://github.com/haomiaoyan"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub 源码仓库"
        >
          <span className="social__filled" aria-hidden="true" />
          <svg className="social__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
          </svg>
        </a>
      </li>
      <li className="social__item">
        <span className="social__tooltip">课程反馈</span>
        <a className="social__link" href="mailto:student@example.edu" aria-label="邮件反馈">
          <span className="social__filled" aria-hidden="true" />
          <svg className="social__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
            <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
          </svg>
        </a>
      </li>
    </ul>
  );
}
