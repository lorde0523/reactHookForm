import SearchForm from "../components/search-form/SearchForm";

export default function Home() {
  return (
    <main className="app-shell">
      <section className="page-heading">
        <div>
          <p className="eyebrow">OPERATIONS CENTER</p>
          <h1>업무 게시물 통합 조회</h1>
          <p className="page-description">
            필요한 조건을 조합해 게시물을 빠르게 찾고, 자주 쓰는 조회조건은
            이름을 붙여 저장할 수 있습니다.
          </p>
        </div>
        <div className="source-badge">
          <span className="source-badge-dot" />
          RHF Single Source
        </div>
      </section>

      <SearchForm />
    </main>
  );
}
