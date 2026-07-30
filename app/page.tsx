"use client";

import { FormEvent, useMemo, useState } from "react";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CODE_SUFFIX_SPACE = 36 ** 3;
const CODE_SPACE = LETTERS.length * CODE_SUFFIX_SPACE;
const MULTIPLIER = 7919;
const OFFSET = 707528;
const MULTIPLIER_INVERSE = 624527;
const MIN_PRICE = 1_000;
const MAX_PRICE = 1_000_000;
const PRICE_STEP = 1_000;
const TOTAL_CODES = MAX_PRICE / PRICE_STEP;
const ITEMS_PER_PAGE = 20;
const TOTAL_PAGES = Math.ceil(TOTAL_CODES / ITEMS_PER_PAGE);

type PriceResult = {
  amount: number;
  code: string;
  index: number;
};

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function positiveModulo(value: number, modulus: number) {
  return ((value % modulus) + modulus) % modulus;
}

function indexToCode(index: number) {
  const encoded = positiveModulo(MULTIPLIER * index + OFFSET, CODE_SPACE);
  const firstCharacter = LETTERS[Math.floor(encoded / CODE_SUFFIX_SPACE)];
  const suffix = (encoded % CODE_SUFFIX_SPACE)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");

  return `${firstCharacter}${suffix}`;
}

function resultFromIndex(index: number): PriceResult {
  return {
    index,
    amount: (index + 1) * PRICE_STEP,
    code: indexToCode(index),
  };
}

function resultFromPrice(amount: number): PriceResult | null {
  if (
    !Number.isInteger(amount) ||
    amount < MIN_PRICE ||
    amount > MAX_PRICE ||
    amount % PRICE_STEP !== 0
  ) {
    return null;
  }

  return resultFromIndex(amount / PRICE_STEP - 1);
}

function resultFromCode(value: string): PriceResult | null {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]{3}$/.test(code)) return null;

  const firstCharacterValue = LETTERS.indexOf(code[0]);
  const suffixValue = Number.parseInt(code.slice(1), 36);
  const encoded =
    firstCharacterValue * CODE_SUFFIX_SPACE + suffixValue;
  const index = positiveModulo(
    MULTIPLIER_INVERSE * positiveModulo(encoded - OFFSET, CODE_SPACE),
    CODE_SPACE,
  );

  if (index < 0 || index >= TOTAL_CODES || indexToCode(index) !== code) {
    return null;
  }

  return resultFromIndex(index);
}

function parsePrice(value: string) {
  let compact = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^rp/, "");

  let multiplier = 1;
  const suffixes = [
    { suffix: "juta", multiplier: 1_000_000 },
    { suffix: "jt", multiplier: 1_000_000 },
    { suffix: "ribu", multiplier: 1_000 },
    { suffix: "rb", multiplier: 1_000 },
    { suffix: "k", multiplier: 1_000 },
  ];

  const matchedSuffix = suffixes.find(({ suffix }) =>
    compact.endsWith(suffix),
  );

  if (matchedSuffix) {
    multiplier = matchedSuffix.multiplier;
    compact = compact.slice(0, -matchedSuffix.suffix.length);
    compact = compact.replace(/\./g, "").replace(",", ".");
  } else {
    compact = compact.replace(/[.,]/g, "");
  }

  if (!/^\d+(?:\.\d+)?$/.test(compact)) return null;

  const amount = Number(compact) * multiplier;
  return Number.isFinite(amount) ? amount : null;
}

function findPrice(value: string): PriceResult | null {
  const normalized = value.trim().toUpperCase();
  const codeResult = resultFromCode(normalized);
  if (codeResult) return codeResult;

  const amount = parsePrice(value);
  return amount === null ? null : resultFromPrice(amount);
}

const INITIAL_RESULT = resultFromPrice(125_000)!;
const EXAMPLES = [
  { label: "Rp25.000", query: "25000", result: resultFromPrice(25_000)! },
  { label: INITIAL_RESULT.code, query: INITIAL_RESULT.code, result: INITIAL_RESULT },
  {
    label: "Rp1.000.000",
    query: "1000000",
    result: resultFromPrice(1_000_000)!,
  },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<PriceResult | null>(INITIAL_RESULT);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [page, setPage] = useState(1);

  const pageItems = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, TOTAL_CODES);

    return Array.from(
      { length: endIndex - startIndex },
      (_, offset) => resultFromIndex(startIndex + offset),
    );
  }, [page]);

  function showResult(found: PriceResult, displayedQuery = found.code) {
    setQuery(displayedQuery);
    setResult(found);
    setError("");
    setCopied("");

    const url = new URL(window.location.href);
    url.searchParams.set("cari", displayedQuery);
    window.history.replaceState({}, "", url);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) {
      setResult(null);
      setError("Masukkan harga atau kode unik terlebih dahulu.");
      return;
    }

    const found = findPrice(query);
    if (!found) {
      setResult(null);
      setError(
        "Data tidak ditemukan. Gunakan harga kelipatan Rp1.000 atau kode 4 karakter.",
      );
      return;
    }

    showResult(found, query.trim().toUpperCase());
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
    } catch {
      setCopied("");
    }
  }

  function selectListItem(item: PriceResult) {
    showResult(item);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function downloadCsv() {
    const rows = ["No,Kode Unik,Harga"];

    for (let index = 0; index < TOTAL_CODES; index += 1) {
      const item = resultFromIndex(index);
      rows.push(`${index + 1},${item.code},${item.amount}`);
    }

    const blob = new Blob([`\uFEFF${rows.join("\n")}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "daftar-kode-harga.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="site-shell">
      <div className="grid-overlay" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-one" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-two" aria-hidden="true" />

      <header className="site-header">
        <a className="brand" href="#" aria-label="KodeHarga, beranda">
          Kode<span>Harga</span>
        </a>
        <p className="range-pill">Rp1.000 — Rp1.000.000</p>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span aria-hidden="true" />
              Cari dengan dua cara
            </p>
            <h1 id="hero-title">Cari harga atau kode.</h1>
            <p className="hero-subtitle">
              Ketik nominal harga atau kode unik 4 karakter. Keduanya akan
              menampilkan pasangan harga dan kode yang sama.
            </p>
          </div>

          <form className="search-form" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="price-search">
              Masukkan harga atau kode unik
            </label>
            <input
              id="price-search"
              name="search"
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value.toUpperCase());
                setError("");
              }}
              placeholder={`Contoh: 25000 atau ${INITIAL_RESULT.code}`}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={20}
              aria-describedby={error ? "search-error" : undefined}
            />
            <button type="submit">Cari</button>
          </form>

          <div className="search-hints" aria-label="Format pencarian">
            <span>Harga: 25.000 / 25rb / 25k</span>
            <span>Kode: {INITIAL_RESULT.code}</span>
          </div>

          <div className="result-region" aria-live="polite">
            {error ? (
              <div className="error-card" id="search-error" role="alert">
                <span className="error-icon" aria-hidden="true">
                  !
                </span>
                <div>
                  <strong>Data belum ditemukan</strong>
                  <p>{error}</p>
                </div>
              </div>
            ) : result ? (
              <article className="result-card" aria-label="Hasil pencarian">
                <div className="result-heading">
                  <span className="success-icon" aria-hidden="true">
                    ✓
                  </span>
                  <div>
                    <span className="result-kicker">Kode 4 karakter</span>
                    <strong>{result.code}</strong>
                  </div>
                  <button
                    className="copy-button"
                    type="button"
                    onClick={() => copyCode(result.code)}
                  >
                    {copied === result.code ? "Tersalin" : "Salin kode"}
                  </button>
                </div>
                <div className="result-divider" />
                <div className="price-row">
                  <span>Nominal harga</span>
                  <p>{rupiahFormatter.format(result.amount)}</p>
                </div>
              </article>
            ) : null}
          </div>

          <div className="examples" aria-label="Contoh pencarian">
            <p>Coba pencarian</p>
            <div className="example-list">
              {EXAMPLES.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => showResult(example.result, example.query)}
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section
          className="directory-section"
          id="daftar-kode"
          aria-labelledby="directory-title"
        >
          <div className="directory-heading">
            <div>
              <p className="section-label">Daftar lengkap</p>
              <h2 id="directory-title">1.000 kode &amp; harga.</h2>
              <p>
                Mulai Rp1.000 sampai Rp1.000.000 dengan kenaikan Rp1.000.
                Klik kode untuk melihat hasilnya di pencarian.
              </p>
            </div>
            <button
              className="download-button"
              type="button"
              onClick={downloadCsv}
            >
              Unduh daftar CSV
            </button>
          </div>

          <div className="directory-toolbar">
            <p>
              Menampilkan {((page - 1) * ITEMS_PER_PAGE) + 1}–
              {Math.min(page * ITEMS_PER_PAGE, TOTAL_CODES)} dari {TOTAL_CODES}
            </p>
            <label>
              Halaman
              <select
                value={page}
                onChange={(event) => setPage(Number(event.target.value))}
              >
                {Array.from({ length: TOTAL_PAGES }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {index + 1}
                  </option>
                ))}
              </select>
              dari {TOTAL_PAGES}
            </label>
          </div>

          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th scope="col">No.</th>
                  <th scope="col">Kode unik</th>
                  <th scope="col">Harga</th>
                  <th scope="col">
                    <span className="sr-only">Tindakan</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => (
                  <tr key={item.code}>
                    <td>{item.index + 1}</td>
                    <td>
                      <button
                        className="table-code"
                        type="button"
                        onClick={() => selectListItem(item)}
                        title={`Cari kode ${item.code}`}
                      >
                        {item.code}
                      </button>
                    </td>
                    <td>{rupiahFormatter.format(item.amount)}</td>
                    <td>
                      <button
                        className="table-copy"
                        type="button"
                        onClick={() => copyCode(item.code)}
                      >
                        {copied === item.code ? "Tersalin" : "Salin"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="pagination" aria-label="Navigasi daftar kode">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              ← Sebelumnya
            </button>
            <span>
              Halaman {page} dari {TOTAL_PAGES}
            </span>
            <button
              type="button"
              disabled={page === TOTAL_PAGES}
              onClick={() =>
                setPage((current) => Math.min(TOTAL_PAGES, current + 1))
              }
            >
              Berikutnya →
            </button>
          </nav>
        </section>
      </main>

      <footer>
        <a className="brand brand-small" href="#">
          Kode<span>Harga</span>
        </a>
        <p>4 karakter, harga jelas.</p>
      </footer>
    </div>
  );
}
