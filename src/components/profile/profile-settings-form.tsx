"use client";

import { IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { avatarSrc } from "@/lib/avatar";
import { prepareAvatarFile } from "@/lib/avatar-compress";
import { updateProfileAction } from "@/server/actions/profile";

type ProfileUser = {
  name: string;
  email: string;
  avatarUrl: string | null;
  updatedAt: string;
};

function revokePreview(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}

export function ProfileSettingsForm({ user }: { user: ProfileUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [processingAvatar, setProcessingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    undefined,
  );

  const hasNewAvatarFile = avatarFile !== null;
  const hasChanges = useMemo(
    () =>
      name.trim() !== user.name || hasNewAvatarFile || removeAvatar,
    [name, user.name, hasNewAvatarFile, removeAvatar],
  );

  const prevProfileStateRef = useRef<typeof state>(undefined);
  useEffect(() => {
    if (state === prevProfileStateRef.current) return;
    prevProfileStateRef.current = state;
    const id = window.setTimeout(() => {
      if (state?.success) {
        setRemoveAvatar(false);
        setAvatarFile(null);
        setSelectedFileName(null);
        setPreviewUrl((prev) => {
          revokePreview(prev);
          return null;
        });
        toast.success("Профиль сохранён");
        router.refresh();
      } else if (state?.error) {
        toast.error(state.error);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [state, router]);

  function clearAvatarSelection() {
    setAvatarFile(null);
    setSelectedFileName(null);
    setPreviewUrl((prev) => {
      revokePreview(prev);
      return null;
    });
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      clearAvatarSelection();
      return;
    }

    setProcessingAvatar(true);
    try {
      const result = await prepareAvatarFile(file);
      if (!result.ok) {
        toast.error(result.error);
        clearAvatarSelection();
        return;
      }

      setRemoveAvatar(false);
      setAvatarFile(result.file);
      setSelectedFileName(file.name);
      setPreviewUrl((prev) => {
        revokePreview(prev);
        return result.previewUrl;
      });
    } finally {
      setProcessingAvatar(false);
    }
  }

  function handleRemoveAvatarClick() {
    setRemoveAvatar(true);
    clearAvatarSelection();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges || pending || processingAvatar) return;

    const formData = new FormData(event.currentTarget);
    if (avatarFile) {
      formData.set("avatar", avatarFile);
    } else {
      formData.delete("avatar");
    }

    startTransition(() => {
      formAction(formData);
    });
  }

  const showAvatarImage =
    !removeAvatar && (previewUrl ?? Boolean(user.avatarUrl));

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-md space-y-5"
    >
      <input type="hidden" name="removeAvatar" value={removeAvatar ? "1" : "0"} />

      <section className="flex flex-col items-center gap-4 text-center">
        {showAvatarImage && previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="size-28 shrink-0 rounded-full object-cover ring-1 ring-brand-neutral"
          />
        ) : showAvatarImage && user.avatarUrl ? (
          <img
            src={avatarSrc(user.avatarUrl, user.updatedAt) ?? user.avatarUrl}
            alt=""
            className="size-28 shrink-0 rounded-full object-cover ring-1 ring-brand-neutral"
          />
        ) : (
          <UserAvatar name={name || user.name} size="xl" />
        )}

        <div className="w-full space-y-3 text-left">
          <div>
            <Label htmlFor="avatar-file">Аватар</Label>
            <div className="mt-1.5 flex h-11 overflow-hidden rounded-xl border border-brand-neutral bg-brand-bg">
              <button
                type="button"
                className="flex h-full shrink-0 items-center border-r border-brand-neutral bg-brand-surface px-4 text-sm font-medium text-white transition-colors hover:bg-brand-neutral/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-lime disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pending || processingAvatar}
                onClick={() => avatarInputRef.current?.click()}
              >
                Выберите файл
              </button>
              <span
                className="flex min-w-0 flex-1 items-center truncate px-3 text-sm text-brand-muted"
                title={selectedFileName ?? undefined}
              >
                {processingAvatar
                  ? "Обработка…"
                  : (selectedFileName ?? "Файл не выбран")}
              </span>
              {selectedFileName ? (
                <button
                  type="button"
                  className="flex h-full w-10 shrink-0 items-center justify-center border-l border-brand-neutral text-brand-muted transition-colors hover:bg-brand-neutral/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-lime disabled:pointer-events-none disabled:opacity-50"
                  disabled={pending || processingAvatar}
                  aria-label="Убрать выбранный файл"
                  onClick={clearAvatarSelection}
                >
                  <IconX className="size-4" stroke={2} />
                </button>
              ) : null}
              <input
                ref={avatarInputRef}
                id="avatar-file"
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={pending || processingAvatar}
                aria-busy={processingAvatar}
                onChange={handleFileChange}
              />
            </div>
          </div>
          {user.avatarUrl && !removeAvatar && !hasNewAvatarFile ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending || processingAvatar}
                onClick={handleRemoveAvatarClick}
              >
                Удалить аватар
              </Button>
            </div>
          ) : null}
          {removeAvatar ? (
            <p className="text-center text-xs text-brand-muted">
              Аватар будет удалён после сохранения
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 border-t border-brand-neutral/60 pt-5 text-left">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={user.email}
            readOnly
            disabled
            className="mt-1.5 text-brand-muted"
          />
        </div>
        <div>
          <Label htmlFor="name">Отображаемое имя</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-brand-muted">
            Обновится в турнирах и таблице лидеров
          </p>
        </div>
      </section>

      <div className="border-t border-brand-neutral/60 pt-5">
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={!hasChanges || pending || processingAvatar}
        >
          {pending ? "Сохраняем…" : "Сохранить"}
        </Button>
      </div>
    </form>
  );
}
