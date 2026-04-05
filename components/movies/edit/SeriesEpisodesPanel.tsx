import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/Badge";
import type { SeriesEpisode } from "@/components/movies/edit/types";

interface SeriesEpisodesPanelProps {
  episodes: SeriesEpisode[];
  episodesLoading: boolean;
  deletingEpisodeId: string | null;
  onOpenAddEpisode: () => void;
  onOpenEditEpisode: (episode: SeriesEpisode) => void;
  onRequestDeleteEpisode: (episode: SeriesEpisode) => void;

  editingEpisode: SeriesEpisode | null;
  setEditingEpisode: (episode: SeriesEpisode | null) => void;
  editEpisodeTitle: string;
  setEditEpisodeTitle: (value: string) => void;
  editEpisodeDuration: string;
  setEditEpisodeDuration: (value: string) => void;
  editEpisodeFree: boolean;
  setEditEpisodeFree: (value: boolean) => void;
  setEditEpisodeVideo: (file: File | null) => void;
  savingEpisode: boolean;
  onSaveEpisodeEdit: (e: React.FormEvent) => Promise<void>;

  showAddEpisode: boolean;
  setShowAddEpisode: (value: boolean) => void;
  addEpisodeTitle: string;
  setAddEpisodeTitle: (value: string) => void;
  addEpisodeDuration: string;
  setAddEpisodeDuration: (value: string) => void;
  addEpisodeFree: boolean;
  setAddEpisodeFree: (value: boolean) => void;
  setAddEpisodeVideo: (file: File | null) => void;
  addingEpisode: boolean;
  onAddEpisodeSubmit: (e: React.FormEvent) => Promise<void>;

  deleteConfirmEpisode: SeriesEpisode | null;
  setDeleteConfirmEpisode: (episode: SeriesEpisode | null) => void;
  onConfirmDeleteEpisode: () => Promise<void>;
}

export function SeriesEpisodesPanel({
  episodes,
  episodesLoading,
  deletingEpisodeId,
  onOpenAddEpisode,
  onOpenEditEpisode,
  onRequestDeleteEpisode,
  editingEpisode,
  setEditingEpisode,
  editEpisodeTitle,
  setEditEpisodeTitle,
  editEpisodeDuration,
  setEditEpisodeDuration,
  editEpisodeFree,
  setEditEpisodeFree,
  setEditEpisodeVideo,
  savingEpisode,
  onSaveEpisodeEdit,
  showAddEpisode,
  setShowAddEpisode,
  addEpisodeTitle,
  setAddEpisodeTitle,
  addEpisodeDuration,
  setAddEpisodeDuration,
  addEpisodeFree,
  setAddEpisodeFree,
  setAddEpisodeVideo,
  addingEpisode,
  onAddEpisodeSubmit,
  deleteConfirmEpisode,
  setDeleteConfirmEpisode,
  onConfirmDeleteEpisode,
}: SeriesEpisodesPanelProps) {
  return (
    <>
      <Card padding="lg">
        <CardHeader
          title="Episodes"
          subtitle={`${episodes.length} episode${episodes.length !== 1 ? "s" : ""}`}
          action={<Button type="button" size="sm" onClick={onOpenAddEpisode}>+ Add episode</Button>}
        />
        {episodesLoading ? (
          <div className="py-10 flex justify-center"><Spinner size="md" /></div>
        ) : episodes.length === 0 ? (
          <div className="mt-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">No episodes yet.</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onOpenAddEpisode}>Add first episode</Button>
          </div>
        ) : (
          <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10">
                  <tr>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 w-10">#</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Title</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 w-20">Duration</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 w-16">Free</th>
                    <th className="w-28 py-2.5 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {episodes.map((ep) => (
                    <tr key={ep.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white text-xs">{ep.episode_number}</td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">{ep.title || `Episode ${ep.episode_number}`}</td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 text-xs">{ep.duration != null ? `${ep.duration}m` : "—"}</td>
                      <td className="py-2.5 px-4">{ep.is_free_preview ? <Badge variant="success">Yes</Badge> : <span className="text-slate-400 text-xs">—</span>}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex gap-1.5">
                          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenEditEpisode(ep)}>Edit</Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onRequestDeleteEpisode(ep)}
                            disabled={deletingEpisodeId === ep.id}
                            className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          >
                            {deletingEpisodeId === ep.id ? "…" : "Delete"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={!!editingEpisode}
        onClose={() => setEditingEpisode(null)}
        title={editingEpisode ? `Edit Episode ${editingEpisode.episode_number}` : ""}
        size="md"
      >
        {editingEpisode && (
          <form onSubmit={onSaveEpisodeEdit} className="space-y-5">
            <Input
              label="Title"
              value={editEpisodeTitle}
              onChange={(e) => setEditEpisodeTitle(e.target.value)}
              placeholder={`Episode ${editingEpisode.episode_number}`}
            />
            <Input
              label="Duration (min)"
              type="number"
              min="0"
              value={editEpisodeDuration}
              onChange={(e) => setEditEpisodeDuration(e.target.value)}
              placeholder="—"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editEpisodeFree}
                onChange={(e) => setEditEpisodeFree(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-red-500 focus:ring-red-500/50"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Free preview</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Replace video (optional)</label>
              <input
                type="file"
                accept="video/mp4,video/webm"
                onChange={(e) => setEditEpisodeVideo(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-slate-600 dark:text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-500 file:text-white file:text-sm file:cursor-pointer hover:file:bg-red-600"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" isLoading={savingEpisode} disabled={savingEpisode}>Save</Button>
              <Button type="button" variant="outline" onClick={() => setEditingEpisode(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={showAddEpisode}
        onClose={() => setShowAddEpisode(false)}
        title="Add episode"
        size="md"
      >
        <form onSubmit={onAddEpisodeSubmit} className="space-y-5">
          <Input
            label="Title"
            value={addEpisodeTitle}
            onChange={(e) => setAddEpisodeTitle(e.target.value)}
            placeholder="Episode title"
          />
          <Input
            label="Duration (min)"
            type="number"
            min="0"
            value={addEpisodeDuration}
            onChange={(e) => setAddEpisodeDuration(e.target.value)}
            placeholder="—"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={addEpisodeFree}
              onChange={(e) => setAddEpisodeFree(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-red-500 focus:ring-red-500/50"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Free preview</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Video file (required)</label>
            <input
              type="file"
              accept="video/mp4,video/webm"
              required
              onChange={(e) => setAddEpisodeVideo(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-600 dark:text-slate-400 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-500 file:text-white file:text-sm file:cursor-pointer hover:file:bg-red-600"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" isLoading={addingEpisode} disabled={addingEpisode}>Add episode</Button>
            <Button type="button" variant="outline" onClick={() => setShowAddEpisode(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirmEpisode}
        onClose={() => setDeleteConfirmEpisode(null)}
        onConfirm={onConfirmDeleteEpisode}
        title="Delete episode?"
        description={
          deleteConfirmEpisode
            ? `"${deleteConfirmEpisode.title || `Episode ${deleteConfirmEpisode.episode_number}`}" will be removed.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </>
  );
}
