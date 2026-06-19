export default function SiteFooter() {
  return (
    <footer
      className="border-t border-[#2a2a2a] bg-[#0f0f0f] px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))]"
      aria-label="Credits"
    >
      <div className="mx-auto max-w-5xl space-y-2 font-mono text-[11px] leading-relaxed text-[#666666]">
        <p>
          Built with Sofa Salon, originally created by{' '}
          <a
            href="https://eveshi.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#e8c84a] hover:underline"
          >
            Shi Qianyi
          </a>
          .
        </p>
        <p>
          Open-source fork maintained at{' '}
          <a
            href="https://github.com/ZiggyZaggyy/sofa-salon"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#e8c84a] hover:underline"
          >
            ZiggyZaggyy/sofa-salon
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
