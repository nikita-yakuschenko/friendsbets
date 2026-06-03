"use client";

import { useMemo, useState } from "react";
import { AdminMatchCard } from "@/components/admin/matches/admin-match-card";
import type { AdminMatchRow } from "@/components/admin/matches/types";
import { ADMIN_LIST_EMPTY_CLASS } from "@/components/admin/admin-detail-row";
import { FormSelect } from "@/components/ui/form-select";
import { Label } from "@/components/ui/label";
import type { TournamentTemplateUi } from "@/lib/tournament-templates";

function sortMatches(rows: AdminMatchRow[]) {
  return [...rows].sort(
    (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
  );
}

export function AdminMatchesView({
  matches,
  templates,
}: {
  matches: AdminMatchRow[];
  templates: TournamentTemplateUi[];
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const filtered = useMemo(() => {
    let rows = matches;
    if (selectedTemplateId) {
      rows = rows.filter((row) => row.templateId === selectedTemplateId);
    }
    return sortMatches(rows);
  }, [matches, selectedTemplateId]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const linkedGamesCount = filtered[0]?.linkedGamesCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2 md:max-w-sm">
        <Label htmlFor="admin-matches-template">Шаблон</Label>
        <FormSelect
          id="admin-matches-template"
          value={selectedTemplateId}
          onChange={(event) => setSelectedTemplateId(event.target.value)}
        >
          <option value="">Выберите шаблон…</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.title}
              {template.isSystem ? "" : " · свой"}
            </option>
          ))}
        </FormSelect>
      </div>

      {!selectedTemplateId ? (
        <p className={ADMIN_LIST_EMPTY_CLASS}>
          Выберите шаблон, чтобы увидеть матчи и проставить результаты.
        </p>
      ) : filtered.length === 0 ? (
        <p className={ADMIN_LIST_EMPTY_CLASS}>
          У шаблона «{selectedTemplate?.title}» пока нет матчей. Синхронизируйте
          календарь Championat.
        </p>
      ) : (
        <>
          <p className="text-xs text-brand-muted">
            {filtered.length}{" "}
            {filtered.length === 1 ? "матч" : "матчей"}
            {linkedGamesCount > 0
              ? ` · ${linkedGamesCount} ${
                  linkedGamesCount === 1 ? "турнир" : "турниров"
                } на шаблоне`
              : ""}
          </p>
          <div className="space-y-3">
            {filtered.map((match) => (
              <AdminMatchCard key={match.id} match={match} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
