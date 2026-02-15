import { MovieCard } from "./MovieCard";
import { Spinner } from "@/components/ui/Spinner";
import type { Movie } from "@/types";

interface MovieListProps {
  movies: Movie[];
  isLoading: boolean;
}

export function MovieList({ movies, isLoading }: MovieListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 dark:text-slate-500">No movies found.</p>
        <p className="text-sm text-slate-600 dark:text-slate-500 mt-1">
          Try adjusting your filters or add a new movie.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  );
}
