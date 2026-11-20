import React, { useState, useEffect } from 'react';

function MovieCard({ movie, apiKey }) {
  const [plot, setPlot] = useState('');
  const [plotLoading, setPlotLoading] = useState(false);

  const posterUrl =
    movie.Poster !== 'N/A'
      ? movie.Poster
      : 'https://via.placeholder.com/300x450?text=No+Poster';

  useEffect(() => {
    if (!apiKey || !movie.imdbID) return;

    const controller = new AbortController();

    const loadPlot = async () => {
      try {
        setPlotLoading(true);
        const res = await fetch(
          `https://www.omdbapi.com/?i=${encodeURIComponent(movie.imdbID)}&apikey=${apiKey}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.Plot && data.Plot !== 'N/A') {
          setPlot(data.Plot);
        } else {
          setPlot('Описание отсутствует.');
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setPlot('');
        }
      } finally {
        setPlotLoading(false);
      }
    };

    loadPlot();
    return () => controller.abort();
  }, [movie.imdbID, apiKey]);

  return (
    <article className="movie-card">
      <img src={posterUrl} alt={movie.Title} />
      <h3>{movie.Title}</h3>
      <p><strong>Год:</strong> {movie.Year}</p>
      {plotLoading ? (
        <p className="plot-loading">
          <span className="spinner" aria-hidden="true" />
          Загрузка описания...
        </p>
      ) : (
        plot && <p>{plot}</p>
      )}
    </article>
  );
}

export default MovieCard;
