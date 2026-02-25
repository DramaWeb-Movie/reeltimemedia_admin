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
      <div className="text-center py-20 rounded-xl border border-dashed border-slate-600 bg-slate-800/30">
        <p className="text-slate-300 font-medium">No movies found</p>
        <p className="text-sm text-slate-500 mt-1">
          Try adjusting your filters or add a new movie.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  );
}
