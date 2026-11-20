import React, { useState, useEffect, useCallback } from 'react';
import MovieCard from './MovieCard';

const API_KEY = import.meta.env.VITE_OMDB_API_KEY || '';
const HISTORY_KEY = 'movie_search_history';

function App() {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, loading, error, success
  const [error, setError] = useState(null);

  // Пагинация
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Фильтрация по году на клиенте
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');

  // История последних 5 запросов в localStorage
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveToHistory = (searchTerm) => {
    setHistory((prev) => {
      const updated = [searchTerm, ...prev.filter((item) => item.toLowerCase() !== searchTerm.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Игнорируем ошибки localStorage
      }
      return updated;
    });
  };

  const fetchMovies = useCallback(async (searchQuery, pageNumber = 1) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setMovies([]);
      setTotalResults(0);
      setStatus('idle');
      setError(null);
      return;
    }

    if (!API_KEY) {
      setMovies([]);
      setTotalResults(0);
      setStatus('error');
      setError('Не задан VITE_OMDB_API_KEY в файле .env');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const res = await fetch(
        `https://www.omdbapi.com/?s=${encodeURIComponent(trimmed)}&page=${pageNumber}&apikey=${API_KEY}`
      );
      if (!res.ok) throw new Error('Ошибка сети');

      const data = await res.json();

      if (data.Error) {
        setMovies([]);
        setTotalResults(0);
        setStatus('error');
        setError('Ничего не найдено');
        return;
      }

      setMovies(data.Search || []);
      setTotalResults(Number(data.totalResults) || 0);
      setPage(pageNumber);
      setStatus('success');
      saveToHistory(trimmed);
    } catch (err) {
      setMovies([]);
      setTotalResults(0);
      setStatus('error');
      setError(err.message);
    }
  }, []);

  // Автопоиск с debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 2) {
        fetchMovies(query, 1);
      } else {
        setMovies([]);
        setTotalResults(0);
        setPage(1);
        setStatus('idle');
        setError(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, fetchMovies]);

  const handleSearchClick = () => {
    if (status === 'loading') return;
    fetchMovies(query, 1);
  };

  const handleHistoryClick = (item) => {
    setQuery(item);
    fetchMovies(item, 1);
  };

  const filteredMovies = movies.filter((movie) => {
    const movieYear = parseInt(movie.Year, 10);
    if (Number.isNaN(movieYear)) return true;
    if (yearFrom !== '' && movieYear < Number(yearFrom)) return false;
    if (yearTo !== '' && movieYear > Number(yearTo)) return false;
    return true;
  });

  const totalPages = Math.ceil(totalResults / 10);

  return (
    <main className="app">
      <h1>Поиск фильмов</h1>

      <div className="search-bar">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearchClick();
          }}
          placeholder="Введите название фильма..."
        />
        <button
          onClick={handleSearchClick}
          disabled={status === 'loading'}
        >
          Найти
        </button>
      </div>

      <div className="filters-row">
        <label>
          Год от:
          <input
            type="number"
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
            placeholder="1990"
          />
        </label>
        <label>
          Год до:
          <input
            type="number"
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
            placeholder="2026"
          />
        </label>
      </div>

      {history.length > 0 && (
        <div className="history">
          <span className="history-label">Недавние запросы:</span>
          {history.map((item) => (
            <button
              key={item}
              type="button"
              className="history-chip"
              onClick={() => handleHistoryClick(item)}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {status === 'idle' && (
        <p>Введите название фильма и нажмите «Найти».</p>
      )}

      {status === 'loading' && <p>Загрузка...</p>}

      {status === 'error' && (
        <div className="error">
          <p>Ошибка: {error}</p>
        </div>
      )}

      {status === 'success' && filteredMovies.length === 0 && (
        <p>Ничего не найдено по вашему запросу.</p>
      )}

      {status === 'success' && filteredMovies.length > 0 && (
        <>
          <div className="movie-list">
            {filteredMovies.map((movie) => (
              <MovieCard key={movie.imdbID} movie={movie} apiKey={API_KEY} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => fetchMovies(query, page - 1)}
                disabled={page <= 1 || status === 'loading'}
              >
                Предыдущая страница
              </button>
              <span>
                Страница {page} из {totalPages}
              </span>
              <button
                onClick={() => fetchMovies(query, page + 1)}
                disabled={page >= totalPages || status === 'loading'}
              >
                Следующая страница
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default App;
