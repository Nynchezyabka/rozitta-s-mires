export class BoxConflictError extends Error {
  constructor() {
    super("Сундук уже изменили на другом устройстве. Ваши правки остались здесь, но не записаны поверх чужих.");
    this.name = "BoxConflictError";
  }
}

export function requireRevision(id: string | undefined, restore: boolean | undefined, revision: number | undefined): number | null {
  if (!id || restore) return null;
  if (!Number.isInteger(revision) || revision === undefined || revision < 1) throw new BoxConflictError();
  return revision;
}